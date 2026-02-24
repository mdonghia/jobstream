import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all active recurring parent jobs
    const parentJobs = await prisma.job.findMany({
      where: {
        isRecurring: true,
        status: { notIn: ["CANCELLED"] },
        // Only parents (no parentJobId)
        parentJobId: null,
      },
      include: {
        lineItems: true,
        assignments: true,
        checklistItems: true,
        organization: {
          select: { id: true, nextJobNum: true, jobPrefix: true },
        },
      },
    })

    let totalCreated = 0

    for (const parent of parentJobs) {
      // Check end conditions
      if (parent.recurrenceEndDate && new Date() > parent.recurrenceEndDate)
        continue

      // Count existing children
      const childCount = await prisma.job.count({
        where: { parentJobId: parent.id },
      })
      if (parent.recurrenceCount && childCount >= parent.recurrenceCount)
        continue

      // Calculate interval
      const intervalMs =
        {
          DAILY: 1 * 24 * 60 * 60 * 1000,
          WEEKLY: 7 * 24 * 60 * 60 * 1000,
          BIWEEKLY: 14 * 24 * 60 * 60 * 1000,
          MONTHLY: 30 * 24 * 60 * 60 * 1000,
          QUARTERLY: 91 * 24 * 60 * 60 * 1000,
          BIANNUALLY: 182 * 24 * 60 * 60 * 1000,
          ANNUALLY: 365 * 24 * 60 * 60 * 1000,
        }[parent.recurrenceRule || "WEEKLY"] ||
        7 * 24 * 60 * 60 * 1000

      const duration =
        parent.scheduledEnd.getTime() - parent.scheduledStart.getTime()
      const fourWeeksFromNow = Date.now() + 28 * 24 * 60 * 60 * 1000

      // Find the latest child to know where to continue from
      const latestChild = await prisma.job.findFirst({
        where: { parentJobId: parent.id },
        orderBy: { scheduledStart: "desc" },
      })

      let nextDate = latestChild
        ? new Date(latestChild.scheduledStart.getTime() + intervalMs)
        : new Date(parent.scheduledStart.getTime() + intervalMs)

      while (nextDate.getTime() <= fourWeeksFromNow) {
        // Check end conditions
        if (parent.recurrenceEndDate && nextDate > parent.recurrenceEndDate)
          break
        if (parent.recurrenceCount) {
          const currentCount = await prisma.job.count({
            where: { parentJobId: parent.id },
          })
          if (currentCount >= parent.recurrenceCount) break
        }

        // Check for duplicate (same parent, same scheduledStart)
        const existing = await prisma.job.findFirst({
          where: { parentJobId: parent.id, scheduledStart: nextDate },
        })
        if (existing) {
          nextDate = new Date(nextDate.getTime() + intervalMs)
          continue
        }

        // Get next job number atomically
        const org = await prisma.organization.update({
          where: { id: parent.organizationId },
          data: { nextJobNum: { increment: 1 } },
          select: { nextJobNum: true, jobPrefix: true },
        })

        const newJob = await prisma.job.create({
          data: {
            organizationId: parent.organizationId,
            customerId: parent.customerId,
            propertyId: parent.propertyId,
            parentJobId: parent.id,
            jobNumber: `${org.jobPrefix}-${org.nextJobNum - 1}`,
            title: parent.title,
            description: parent.description,
            status: "SCHEDULED",
            priority: parent.priority,
            scheduledStart: nextDate,
            scheduledEnd: new Date(nextDate.getTime() + duration),
            arrivalWindowMinutes: parent.arrivalWindowMinutes,
            subscriptionId: parent.subscriptionId,
          },
        })

        // CRITICAL: Copy line items from parent to child
        if (parent.lineItems.length > 0) {
          await prisma.jobLineItem.createMany({
            data: parent.lineItems.map((li) => ({
              jobId: newJob.id,
              serviceId: li.serviceId,
              name: li.name,
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              total: li.total,
              taxable: li.taxable,
              sortOrder: li.sortOrder,
            })),
          })
        }

        // Copy assignments
        if (parent.assignments.length > 0) {
          await prisma.jobAssignment.createMany({
            data: parent.assignments.map((a) => ({
              jobId: newJob.id,
              userId: a.userId,
              organizationId: parent.organizationId,
            })),
          })
        }

        // Copy checklist items (fresh uncompleted copies)
        if (parent.checklistItems.length > 0) {
          await prisma.jobChecklistItem.createMany({
            data: parent.checklistItems.map((ci) => ({
              jobId: newJob.id,
              label: ci.label,
              sortOrder: ci.sortOrder,
              isCompleted: false,
            })),
          })
        }

        totalCreated++
        nextDate = new Date(nextDate.getTime() + intervalMs)
      }
    }

    return NextResponse.json({ success: true, created: totalCreated })
  } catch (error) {
    console.error("Recurring jobs cron error:", error)
    return NextResponse.json(
      { error: "Failed to process recurring jobs" },
      { status: 500 }
    )
  }
}

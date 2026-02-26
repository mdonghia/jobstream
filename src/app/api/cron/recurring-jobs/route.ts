import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { logActivityEvent, ActivityEventTypes } from "@/lib/activity-logger"
import { calculateNextOccurrence } from "@/lib/recurrence"

// =============================================================================
// Recurring jobs cron handler
//
// Finds recurring jobs where the latest visit is COMPLETED and creates the
// next Visit on the same Job. This acts as a safety net -- the primary path
// is still in updateJobStatus(), but this cron catches any jobs that were
// missed (e.g. if the server action failed to create the next visit due to
// a transient error).
// =============================================================================

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization")
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ---------------------------------------------------------------------------
  // Find recurring jobs whose latest visit is COMPLETED, then create the
  // next Visit. This is a catch-up mechanism for any that were missed.
  // ---------------------------------------------------------------------------
  try {
    // Find all recurring jobs that are not cancelled and have a recurrence rule
    const recurringJobs = await prisma.job.findMany({
      where: {
        isRecurring: true,
        parentJobId: null, // Only parent jobs
        recurrenceRule: { not: null },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        organizationId: true,
        scheduledStart: true,
        scheduledEnd: true,
        recurrenceRule: true,
        recurrenceEndDate: true,
        visits: {
          orderBy: { visitNumber: "desc" },
          take: 1,
          select: {
            id: true,
            visitNumber: true,
            status: true,
            scheduledStart: true,
            scheduledEnd: true,
            arrivalWindowMinutes: true,
            assignments: { select: { userId: true } },
          },
        },
      },
    })

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const job of recurringJobs) {
      try {
        const latestVisit = job.visits[0]

        // Skip if there are no visits at all (shouldn't happen for v2 jobs, but be safe)
        if (!latestVisit) {
          skipped++
          continue
        }

        // Skip if the latest visit is NOT completed -- it still needs to be worked
        if (latestVisit.status !== "COMPLETED") {
          skipped++
          continue
        }

        // Determine the base date to calculate next occurrence from.
        // Use the latest visit's scheduledStart if available, otherwise the Job's scheduledStart.
        const baseDate = latestVisit.scheduledStart ?? job.scheduledStart
        const baseDuration = latestVisit.scheduledEnd && latestVisit.scheduledStart
          ? latestVisit.scheduledEnd.getTime() - latestVisit.scheduledStart.getTime()
          : job.scheduledEnd.getTime() - job.scheduledStart.getTime()

        const nextStart = calculateNextOccurrence(baseDate, job.recurrenceRule!)
        const nextEnd = new Date(nextStart.getTime() + baseDuration)

        // Check if the series is done (past the end date)
        if (job.recurrenceEndDate && nextStart > job.recurrenceEndDate) {
          skipped++
          continue
        }

        // Check if a visit already exists for approximately this date (within 1 hour tolerance)
        // to avoid creating duplicates if the inline path already created one
        const oneHour = 60 * 60 * 1000
        const existingNextVisit = await prisma.visit.findFirst({
          where: {
            jobId: job.id,
            scheduledStart: {
              gte: new Date(nextStart.getTime() - oneHour),
              lte: new Date(nextStart.getTime() + oneHour),
            },
            status: { not: "CANCELLED" },
          },
        })

        if (existingNextVisit) {
          skipped++
          continue
        }

        // Create the next visit in a transaction
        const nextVisitNumber = latestVisit.visitNumber + 1

        await prisma.$transaction(async (tx) => {
          const newVisit = await tx.visit.create({
            data: {
              jobId: job.id,
              organizationId: job.organizationId,
              visitNumber: nextVisitNumber,
              purpose: "MAINTENANCE",
              status: "SCHEDULED",
              schedulingType: "SCHEDULED",
              scheduledStart: nextStart,
              scheduledEnd: nextEnd,
              arrivalWindowMinutes: latestVisit.arrivalWindowMinutes ?? null,
            },
          })

          // Copy assignments from the completed visit to the new visit
          if (latestVisit.assignments.length > 0) {
            await tx.visitAssignment.createMany({
              data: latestVisit.assignments.map((a) => ({
                visitId: newVisit.id,
                userId: a.userId,
                organizationId: job.organizationId,
              })),
            })
          }

          // Log activity event
          await logActivityEvent({
            organizationId: job.organizationId,
            jobId: job.id,
            visitId: newVisit.id,
            eventType: ActivityEventTypes.VISIT_CREATED,
            title: `Visit #${nextVisitNumber} auto-created by cron from recurring schedule`,
            description: `Next occurrence scheduled for ${nextStart.toISOString()}`,
            metadata: {
              visitNumber: nextVisitNumber,
              scheduledStart: nextStart.toISOString(),
              scheduledEnd: nextEnd.toISOString(),
              source: "recurring_cron",
            },
          })
        })

        created++
      } catch (e: any) {
        console.error(`Cron: failed to create next visit for job ${job.id}:`, e)
        errors.push(`Job ${job.id}: ${e?.message || "Unknown error"}`)
      }
    }

    return Response.json({
      message: "Recurring jobs cron completed",
      totalRecurring: recurringJobs.length,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Recurring jobs cron failed:", error)
    return Response.json(
      { error: "Recurring jobs cron failed", details: error?.message },
      { status: 500 }
    )
  }
}

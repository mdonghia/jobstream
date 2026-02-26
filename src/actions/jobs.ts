"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { jobSchema } from "@/lib/validations"

import { logActivityEvent, ActivityEventTypes } from "@/lib/activity-logger"

// =============================================================================
// Types
// =============================================================================

type GetJobsParams = {
  status?: string
  search?: string
  assignedUserId?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getJobs - List jobs with filters
// =============================================================================

export async function getJobs(params: GetJobsParams = {}) {
  try {
    const user = await requireAuth()
    const {
      status,
      search,
      assignedUserId,
      priority,
      dateFrom,
      dateTo,
      sortBy = "scheduledStart",
      sortOrder = "desc",
      page = 1,
      perPage = 25,
    } = params

    const where: any = {
      organizationId: user.organizationId,
    }

    if (status === "UNSCHEDULED") {
      where.status = "SCHEDULED"
      where.scheduledStart = { lte: new Date("2000-01-01") }
    } else if (status && status !== "ALL") {
      where.status = status
    }

    if (priority && priority !== "ALL") {
      where.priority = priority
    }

    if (assignedUserId) {
      where.assignments = { some: { userId: assignedUserId } }
    }

    if (dateFrom || dateTo) {
      where.scheduledStart = {}
      if (dateFrom) where.scheduledStart.gte = new Date(dateFrom + "T00:00:00")
      if (dateTo) where.scheduledStart.lte = new Date(dateTo + "T23:59:59")
    }

    // Split on whitespace so multi-word searches like "David Brown" match across fields
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { jobNumber: { contains: word, mode: "insensitive" } },
            { title: { contains: word, mode: "insensitive" } },
            { customer: { firstName: { contains: word, mode: "insensitive" } } },
            { customer: { lastName: { contains: word, mode: "insensitive" } } },
          ],
        })),
      ]
    }

    const allowedSortFields = ["jobNumber", "scheduledStart", "priority", "createdAt"]
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "scheduledStart"

    const skip = (page - 1) * perPage

    const [total, jobs, statusCounts, unscheduledCount] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: perPage,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          assignments: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
              },
            },
          },
        },
      }),
      prisma.job.groupBy({
        by: ["status"],
        where: { organizationId: user.organizationId },
        _count: true,
      }),
      prisma.job.count({
        where: {
          organizationId: user.organizationId,
          status: "SCHEDULED",
          scheduledStart: { lte: new Date("2000-01-01") },
        },
      }),
    ])

    const counts: Record<string, number> = {}
    statusCounts.forEach((s) => {
      counts[s.status] = s._count
    })
    counts["UNSCHEDULED"] = unscheduledCount
    if (counts["SCHEDULED"]) {
      counts["SCHEDULED"] = counts["SCHEDULED"] - unscheduledCount
    }

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      statusCounts: counts,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJobs error:", error)
    return { error: "Failed to fetch jobs" }
  }
}

// =============================================================================
// 2. getJob - Get single job with all relations
// =============================================================================

export async function getJob(id: string) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: {
          include: { properties: true },
        },
        property: true,
        quote: { select: { id: true, quoteNumber: true } },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
            },
          },
        },
        checklistItems: { orderBy: { sortOrder: "asc" } },
        notes: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
    })

    if (!job) return { error: "Job not found" }

    // Resolve S3 URLs to signed URLs for attachments
    const { getFileUrl } = await import("@/lib/s3")
    const resolvedAttachments = await Promise.all(
      job.attachments.map(async (a) => ({
        ...a,
        fileUrl: await getFileUrl(a.fileUrl),
      }))
    )

    return {
      job: {
        ...job,
        attachments: resolvedAttachments,
        lineItems: job.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJob error:", error)
    return { error: "Failed to fetch job" }
  }
}

// =============================================================================
// 3. createJob - Create a new job
// =============================================================================

export async function createJob(data: {
  customerId: string
  propertyId?: string
  quoteId?: string
  title: string
  description?: string
  priority?: string
  scheduledStart: string | Date
  scheduledEnd: string | Date
  assignedUserIds?: string[]
  checklistItems?: string[]
  lineItems?: {
    serviceId?: string
    name: string
    description?: string
    quantity: number
    unitPrice: number
    taxable: boolean
  }[]
  internalNote?: string
  isRecurring?: boolean
  recurrenceRule?: string
  recurrenceEndDate?: string | Date
  arrivalWindowMinutes?: number
}) {
  try {
    const user = await requireAuth()

    // Basic validation
    if (!data.customerId) return { error: "Customer is required" }
    if (!data.title) return { error: "Title is required" }
    if (!data.scheduledStart) return { error: "Start date is required" }

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: user.organizationId },
    })
    if (!customer) return { error: "Customer not found" }

    // Get next job number
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextJobNum: { increment: 1 } },
      select: { nextJobNum: true, jobPrefix: true },
    })
    const jobNumber = `${org.jobPrefix}-${org.nextJobNum - 1}`

    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          organizationId: user.organizationId,
          customerId: data.customerId,
          propertyId: data.propertyId || null,
          quoteId: data.quoteId || null,
          jobNumber,
          title: data.title,
          description: data.description || null,
          status: "SCHEDULED",
          priority: (data.priority as any) || "MEDIUM",
          scheduledStart: new Date(data.scheduledStart),
          scheduledEnd: new Date(data.scheduledEnd),
          isRecurring: data.isRecurring || false,
          recurrenceRule: data.recurrenceRule || null,
          recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
          arrivalWindowMinutes: data.arrivalWindowMinutes ?? null,
        },
      })

      // Create assignments
      if (data.assignedUserIds && data.assignedUserIds.length > 0) {
        await tx.jobAssignment.createMany({
          data: data.assignedUserIds.map((userId) => ({
            jobId: newJob.id,
            userId,
            organizationId: user.organizationId,
          })),
        })
      }

      // V2 dual-write: create Visit record
      const isUnscheduled = new Date(data.scheduledStart).getTime() < new Date("2000-01-01").getTime()
      const visit = await tx.visit.create({
        data: {
          jobId: newJob.id,
          organizationId: user.organizationId,
          visitNumber: 1,
          purpose: "SERVICE",
          status: "SCHEDULED",
          schedulingType: isUnscheduled ? "UNSCHEDULED" : "SCHEDULED",
          scheduledStart: new Date(data.scheduledStart),
          scheduledEnd: new Date(data.scheduledEnd),
          arrivalWindowMinutes: data.arrivalWindowMinutes ?? null,
        },
      })

      // V2 dual-write: copy assignments to VisitAssignment
      if (data.assignedUserIds && data.assignedUserIds.length > 0) {
        await tx.visitAssignment.createMany({
          data: data.assignedUserIds.map((userId) => ({
            visitId: visit.id,
            userId,
            organizationId: user.organizationId,
          })),
        })
      }

      // Create checklist items
      if (data.checklistItems && data.checklistItems.length > 0) {
        await tx.jobChecklistItem.createMany({
          data: data.checklistItems.map((label, index) => ({
            jobId: newJob.id,
            label,
            sortOrder: index,
          })),
        })
      }

      // Create line items
      if (data.lineItems && data.lineItems.length > 0) {
        await tx.jobLineItem.createMany({
          data: data.lineItems.map((li, index) => ({
            jobId: newJob.id,
            serviceId: li.serviceId || null,
            name: li.name,
            description: li.description || null,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.quantity * li.unitPrice,
            taxable: li.taxable,
            sortOrder: index,
          })),
        })
      }

      // Add internal note
      if (data.internalNote) {
        await tx.jobNote.create({
          data: {
            jobId: newJob.id,
            userId: user.id,
            content: data.internalNote,
          },
        })
      }

      return newJob
    })

    return { jobId: job.id }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createJob error:", error)
    return { error: "Failed to create job" }
  }
}

// =============================================================================
// 4. updateJobStatus - Change job status (workflow transitions)
// =============================================================================

export async function updateJobStatus(
  id: string,
  newStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  data?: { completionNotes?: string; cancelReason?: string }
) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!job) return { error: "Job not found" }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: [], // Can't transition from completed (except reopen below)
      CANCELLED: ["SCHEDULED"], // Reopen
    }

    if (!validTransitions[job.status]?.includes(newStatus)) {
      return { error: `Cannot transition from ${job.status} to ${newStatus}` }
    }

    const updateData: any = { status: newStatus }

    if (newStatus === "IN_PROGRESS") {
      updateData.actualStart = new Date()
    } else if (newStatus === "COMPLETED") {
      updateData.actualEnd = new Date()
      if (data?.completionNotes) {
        updateData.completionNotes = data.completionNotes
      }
    } else if (newStatus === "CANCELLED") {
      if (data?.cancelReason) {
        updateData.cancelReason = data.cancelReason
      }
    }

    await prisma.job.update({
      where: { id },
      data: updateData,
    })

    // V2 dual-write: update Visit status to match
    const visitStatusMap: Record<string, string> = {
      SCHEDULED: "SCHEDULED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
    }
    await prisma.visit.updateMany({
      where: { jobId: id },
      data: {
        status: visitStatusMap[newStatus] as any,
        ...(newStatus === "IN_PROGRESS" ? { actualStart: new Date() } : {}),
        ...(newStatus === "COMPLETED" ? { actualEnd: new Date(), completionNotes: data?.completionNotes || null } : {}),
      },
    })

    // Auto-send review request when job is completed (if enabled)
    if (newStatus === "COMPLETED") {
      try {
        const org = await prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { reviewAutoRequest: true, reviewRequestDelay: true },
        })

        if (org?.reviewAutoRequest) {
          // Fire and forget -- don't block the status update
          const { sendReviewRequest } = await import("@/actions/reviews")
          sendReviewRequest(id).catch((err: any) => {
            console.error("Auto review request failed:", err)
          })
        }
      } catch (e) {
        // Don't fail the job status update if review request fails
        console.error("Review auto-request check failed:", e)
      }

      // Auto-create invoice when job is completed (if enabled)
      try {
        const orgSettings = await prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { autoInvoiceOnJobComplete: true },
        })

        if (orgSettings?.autoInvoiceOnJobComplete) {
          const { createAndSendInvoiceFromJob } = await import("@/actions/invoices")
          const result = await createAndSendInvoiceFromJob(id, user.organizationId)
          if (result.error) {
            console.error("Auto-invoicing returned error:", result.error)
            // Create notification so user knows to invoice manually
            const orgOwner = await prisma.user.findFirst({
              where: { organizationId: user.organizationId, role: "OWNER" },
              select: { id: true },
            })
            if (orgOwner) {
              await prisma.notification.create({
                data: {
                  organizationId: user.organizationId,
                  userId: orgOwner.id,
                  title: "Auto-Invoicing Failed",
                  message: `Auto-invoicing failed for Job #${job.jobNumber} - please create an invoice manually`,
                  linkUrl: `/jobs/${id}`,
                },
              })
            }
          }
        }
      } catch (e) {
        // Don't fail the job status update if auto-invoicing fails
        console.error("Auto-invoicing failed:", e)
        try {
          const orgOwner = await prisma.user.findFirst({
            where: { organizationId: user.organizationId, role: "OWNER" },
            select: { id: true },
          })
          if (orgOwner) {
            await prisma.notification.create({
              data: {
                organizationId: user.organizationId,
                userId: orgOwner.id,
                title: "Auto-Invoicing Failed",
                message: `Auto-invoicing failed for Job #${job.jobNumber} - please create an invoice manually`,
                linkUrl: `/jobs/${id}`,
              },
            })
          }
        } catch {
          // Last resort: just log it
          console.error("Failed to create auto-invoicing failure notification")
        }
      }

      // -----------------------------------------------------------------------
      // Recurring job cycling: when a recurring parent job is completed,
      // either cycle the job row (v1) or create a new Visit (v2).
      // -----------------------------------------------------------------------
      if (job.isRecurring && !job.parentJobId && job.recurrenceRule) {
        try {
          const duration = job.scheduledEnd.getTime() - job.scheduledStart.getTime()
          const nextStart = calculateNextOccurrence(job.scheduledStart, job.recurrenceRule)

          // Check if the series is done (past the end date)
          const seriesDone = job.recurrenceEndDate && nextStart > job.recurrenceEndDate

          if (!seriesDone) {
            // Create a new Visit on the same Job for the next occurrence.
            // This preserves visit history instead of overwriting dates on
            // the Job row.
            await createNextRecurringVisit({
              jobId: id,
              organizationId: user.organizationId,
              userId: user.id,
              nextStart,
              duration,
            })
          }
        } catch (e) {
          // Don't fail the status update if recurring cycling fails
          console.error("Recurring job cycling failed:", e)
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateJobStatus error:", error)
    return { error: "Failed to update job status" }
  }
}

/**
 * Calculate the next occurrence date for a recurring job.
 * Uses proper Date methods for month/year boundaries.
 */
function calculateNextOccurrence(currentStart: Date, recurrenceRule: string): Date {
  const next = new Date(currentStart)

  switch (recurrenceRule) {
    case "DAILY":
      next.setDate(next.getDate() + 1)
      break
    case "WEEKLY":
      next.setDate(next.getDate() + 7)
      break
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14)
      break
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1)
      break
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3)
      break
    case "ANNUALLY":
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      // Fallback to weekly
      next.setDate(next.getDate() + 7)
      break
  }

  return next
}

/**
 * V2: Create the next recurring Visit on a Job when the current visit is completed.
 *
 * Instead of overwriting the Job's scheduledStart/scheduledEnd (which destroys
 * visit history), this creates a brand-new Visit row on the same Job with the
 * computed next occurrence dates and copies the tech assignments from the most
 * recently completed visit.
 */
async function createNextRecurringVisit(params: {
  jobId: string
  organizationId: string
  userId: string
  nextStart: Date
  duration: number
}): Promise<void> {
  const { jobId, organizationId, userId, nextStart, duration } = params
  const nextEnd = new Date(nextStart.getTime() + duration)

  await prisma.$transaction(async (tx) => {
    // Find the highest visitNumber on this job
    const lastVisit = await tx.visit.findFirst({
      where: { jobId },
      orderBy: { visitNumber: "desc" },
      select: {
        id: true,
        visitNumber: true,
        arrivalWindowMinutes: true,
        assignments: { select: { userId: true } },
      },
    })

    const nextVisitNumber = (lastVisit?.visitNumber ?? 0) + 1

    // Create the new Visit for the next recurrence
    const newVisit = await tx.visit.create({
      data: {
        jobId,
        organizationId,
        visitNumber: nextVisitNumber,
        purpose: "MAINTENANCE",
        status: "SCHEDULED",
        schedulingType: "SCHEDULED",
        scheduledStart: nextStart,
        scheduledEnd: nextEnd,
        arrivalWindowMinutes: lastVisit?.arrivalWindowMinutes ?? null,
      },
    })

    // Copy assignments from the completed visit to the new visit
    if (lastVisit && lastVisit.assignments.length > 0) {
      await tx.visitAssignment.createMany({
        data: lastVisit.assignments.map((a) => ({
          visitId: newVisit.id,
          userId: a.userId,
          organizationId,
        })),
      })
    }

    // Log an activity event for the new visit creation
    // (fire-and-forget outside the transaction is fine, but we do it inside
    //  the tx to keep the data consistent -- logActivityEvent catches errors)
    await logActivityEvent({
      organizationId,
      jobId,
      visitId: newVisit.id,
      userId,
      eventType: ActivityEventTypes.VISIT_CREATED,
      title: `Visit #${nextVisitNumber} auto-created from recurring schedule`,
      description: `Next occurrence scheduled for ${nextStart.toISOString()}`,
      metadata: {
        visitNumber: nextVisitNumber,
        scheduledStart: nextStart.toISOString(),
        scheduledEnd: nextEnd.toISOString(),
        source: "recurring_auto",
      },
    })
  })
}

// =============================================================================
// 5. addJobNote - Add a note to a job
// =============================================================================

export async function addJobNote(jobId: string, content: string) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
    })
    if (!job) return { error: "Job not found" }
    if (!content.trim()) return { error: "Note content is required" }

    const note = await prisma.jobNote.create({
      data: {
        jobId,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
    })

    return { note }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to add note" }
  }
}

// =============================================================================
// 6. toggleChecklistItem - Toggle a checklist item completion
// =============================================================================

export async function toggleChecklistItem(itemId: string) {
  try {
    const user = await requireAuth()

    const item = await prisma.jobChecklistItem.findUnique({
      where: { id: itemId },
      include: { job: { select: { organizationId: true } } },
    })
    if (!item || item.job.organizationId !== user.organizationId) {
      return { error: "Checklist item not found" }
    }

    await prisma.jobChecklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: !item.isCompleted,
        completedAt: !item.isCompleted ? new Date() : null,
        completedByUserId: !item.isCompleted ? user.id : null,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to toggle checklist item" }
  }
}

// =============================================================================
// 7. getCalendarJobs - Get jobs for calendar view
// =============================================================================

export async function getCalendarJobs(params: {
  start: string
  end: string
  userIds?: string[]
}) {
  try {
    const user = await requireAuth()

    const rangeStart = new Date(params.start)
    const rangeEnd = new Date(params.end)

    // Build a base filter shared by both queries
    const baseWhere: any = {
      organizationId: user.organizationId,
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    }

    if (params.userIds && params.userIds.length > 0) {
      baseWhere.assignments = { some: { userId: { in: params.userIds } } }
    }

    // 1. Fetch non-recurring jobs whose scheduledStart falls in the range
    const nonRecurringWhere = {
      ...baseWhere,
      scheduledStart: { gte: rangeStart, lte: rangeEnd },
      isRecurring: false,
    }

    // 2. Fetch recurring jobs whose scheduledStart is on or before the range end.
    //    We need these so we can project virtual future occurrences into the range.
    const recurringWhere = {
      ...baseWhere,
      scheduledStart: { lte: rangeEnd },
      isRecurring: true,
    }

    const includeClause = {
      customer: {
        select: { firstName: true, lastName: true },
      },
      assignments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, color: true },
          },
        },
      },
    }

    const [nonRecurringJobs, recurringJobs] = await Promise.all([
      prisma.job.findMany({
        where: nonRecurringWhere,
        include: includeClause,
        orderBy: { scheduledStart: "asc" },
      }),
      prisma.job.findMany({
        where: recurringWhere,
        include: includeClause,
        orderBy: { scheduledStart: "asc" },
      }),
    ])

    // 3. Expand recurring jobs into virtual occurrences within the date range.
    //    The "real" occurrence (the actual scheduledStart) is included if it falls
    //    in range, plus we project forward from that date using the recurrence rule.
    const allJobs: any[] = [...nonRecurringJobs]

    for (const job of recurringJobs) {
      const duration = job.scheduledEnd.getTime() - job.scheduledStart.getTime()
      const seriesEnd = job.recurrenceEndDate ?? null

      // Walk forward from the job's current scheduledStart generating occurrences
      let occurrenceStart = new Date(job.scheduledStart)

      // Safety limit to prevent infinite loops (max 120 occurrences per job)
      let safety = 0
      while (occurrenceStart <= rangeEnd && safety < 120) {
        safety++

        // Stop if past the series end date
        if (seriesEnd && occurrenceStart > seriesEnd) break

        // Include this occurrence if it falls within the range
        if (occurrenceStart >= rangeStart && occurrenceStart <= rangeEnd) {
          const occurrenceEnd = new Date(occurrenceStart.getTime() + duration)
          const isRealOccurrence = occurrenceStart.getTime() === job.scheduledStart.getTime()

          // For virtual (projected) occurrences, generate a unique ID so the
          // calendar can render them as separate items. The real job ID is kept
          // in `realJobId` so clicks still navigate to the correct detail page.
          const occurrenceId = isRealOccurrence
            ? job.id
            : `${job.id}__${occurrenceStart.toISOString()}`

          allJobs.push({
            ...job,
            id: occurrenceId,
            realJobId: job.id,
            scheduledStart: occurrenceStart,
            scheduledEnd: occurrenceEnd,
            isRecurring: true,
            recurrenceRule: job.recurrenceRule,
          })
        }

        // Advance to the next occurrence
        occurrenceStart = calculateNextOccurrence(occurrenceStart, job.recurrenceRule || "WEEKLY")
      }
    }

    // Sort all jobs by scheduledStart
    allJobs.sort((a, b) => {
      const aTime = a.scheduledStart instanceof Date ? a.scheduledStart.getTime() : new Date(a.scheduledStart).getTime()
      const bTime = b.scheduledStart instanceof Date ? b.scheduledStart.getTime() : new Date(b.scheduledStart).getTime()
      return aTime - bTime
    })

    return { jobs: allJobs }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCalendarJobs error:", error)
    return { error: "Failed to fetch calendar jobs" }
  }
}

// =============================================================================
// 8. getUnscheduledJobs - Jobs without a schedule date
// =============================================================================

export async function getUnscheduledJobs() {
  try {
    const user = await requireAuth()

    // Find jobs that haven't been scheduled to a specific time yet.
    // When a quote is converted to a job, scheduledStart is set to new Date()
    // (the current time) and scheduledEnd is exactly 2 hours later. These are
    // "placeholder" dates that the user should reschedule via the calendar.
    // We also check for legacy jobs with epoch dates.
    const jobs = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        OR: [
          // Legacy: epoch / placeholder dates
          { scheduledStart: { lte: new Date("2000-01-01") } },
          // Quote-converted jobs: scheduledStart was set to approximately createdAt
          // We find jobs where the scheduled start is within 5 seconds of creation time
          // This is handled by raw query below as Prisma can't compare two columns
        ],
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Also find quote-converted jobs where scheduledStart ~= createdAt (within 60s)
    // These are jobs created from quotes that haven't been rescheduled yet
    const quoteConvertedJobs = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        quoteId: { not: null },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Filter quote-converted jobs where scheduledStart is within 60 seconds of createdAt
    const unscheduledFromQuotes = quoteConvertedJobs.filter((j) => {
      const diff = Math.abs(j.scheduledStart.getTime() - j.createdAt.getTime())
      return diff < 60000 // Within 60 seconds
    })

    // Merge and deduplicate
    const allJobs = [...jobs]
    const existingIds = new Set(jobs.map((j) => j.id))
    for (const j of unscheduledFromQuotes) {
      if (!existingIds.has(j.id)) {
        allJobs.push(j)
        existingIds.add(j.id)
      }
    }

    const finalJobs = allJobs.slice(0, 20)

    // Look up booking data (preferredDate, preferredTime) for these jobs
    // Bookings link to jobs via confirmedJobId
    const jobIds = finalJobs.map((j) => j.id)
    const bookings = await prisma.booking.findMany({
      where: {
        organizationId: user.organizationId,
        confirmedJobId: { in: jobIds },
      },
      select: {
        confirmedJobId: true,
        preferredDate: true,
        preferredTime: true,
      },
    })

    // Create a lookup map from jobId -> booking preferences
    const bookingMap = new Map<string, { preferredDate: Date | null; preferredTime: string | null }>()
    for (const b of bookings) {
      if (b.confirmedJobId) {
        bookingMap.set(b.confirmedJobId, {
          preferredDate: b.preferredDate,
          preferredTime: b.preferredTime,
        })
      }
    }

    // Enrich each job with booking preference data
    const enrichedJobs = finalJobs.map((j) => {
      const booking = bookingMap.get(j.id)
      return {
        ...j,
        preferredDate: booking?.preferredDate?.toISOString() ?? null,
        preferredTime: booking?.preferredTime ?? null,
      }
    })

    return { jobs: enrichedJobs }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to fetch unscheduled jobs" }
  }
}

// =============================================================================
// 9. rescheduleJob - Update schedule (for calendar drag-and-drop)
// =============================================================================

export async function rescheduleJob(
  id: string,
  scheduledStart: string | Date,
  scheduledEnd: string | Date
) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    if (!job) return { error: "Job not found" }

    const oldStart = job.scheduledStart
    const newStartDate = new Date(scheduledStart)
    const newEndDate = new Date(scheduledEnd)

    await prisma.job.update({
      where: { id },
      data: {
        scheduledStart: newStartDate,
        scheduledEnd: newEndDate,
      },
    })

    // V2 dual-write: reschedule Visit too
    const isUndoToUnscheduled = newStartDate.getTime() < new Date("2000-01-01").getTime()
    await prisma.visit.updateMany({
      where: { jobId: id },
      data: {
        scheduledStart: newStartDate,
        scheduledEnd: newEndDate,
        schedulingType: isUndoToUnscheduled ? "UNSCHEDULED" : "SCHEDULED",
      },
    })

    // Send email notification to the customer (best effort)
    // Skip if the new date is epoch (undo-to-unscheduled) or if there's no customer email
    if (!isUndoToUnscheduled) {
      // Determine if this is a first-time schedule or a reschedule
      // First-time: old start was epoch/placeholder (before year 2000) or within 60s of creation
      const isFirstTimeSchedule =
        oldStart.getTime() < new Date("2000-01-01").getTime() ||
        Math.abs(oldStart.getTime() - job.createdAt.getTime()) < 60000

      const triggerKey = isFirstTimeSchedule ? "job_scheduled" : "job_rescheduled"

      const { isNotificationEnabled } = await import("@/lib/notification-check")

      if (await isNotificationEnabled(user.organizationId, triggerKey, "email")) {
        if (job.customer.email && process.env.SENDGRID_API_KEY) {
          try {
            const org = await prisma.organization.findUnique({
              where: { id: user.organizationId },
              select: { name: true, defaultArrivalWindow: true },
            })

            const formattedDate = newStartDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
            const formattedTime = newStartDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })

            // Use arrival window for display if configured
            const { formatArrivalTime } = await import("@/lib/format-helpers")
            const arrivalWindow = job.arrivalWindowMinutes ?? org?.defaultArrivalWindow ?? 0
            const arrivalTimeText = arrivalWindow > 0
              ? formatArrivalTime(newStartDate, arrivalWindow)
              : `at ${formattedTime}`

            const subject = isFirstTimeSchedule
              ? `Your appointment has been scheduled - ${org?.name}`
              : `Your appointment has been updated - ${org?.name}`

            const actionText = isFirstTimeSchedule
              ? `Your appointment has been scheduled for <strong>${formattedDate}</strong> <strong>${arrivalTimeText}</strong>.`
              : `Your appointment has been rescheduled to <strong>${formattedDate}</strong> <strong>${arrivalTimeText}</strong>.`

            const sgMail = await import("@sendgrid/mail")
            sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
            await sgMail.default.send({
              to: job.customer.email,
              from: {
                email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                name: org?.name || "JobStream",
              },
              subject,
              html: `
                <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                  <h2>Hi ${job.customer.firstName},</h2>
                  <p>${actionText}</p>
                  <p>If you have any questions or need to make changes, please don't hesitate to contact us.</p>
                  <p>We look forward to seeing you!</p>
                  <br />
                  <p style="color: #666;">- ${org?.name || "JobStream"}</p>
                </div>
              `,
            })

            await prisma.communicationLog.create({
              data: {
                organizationId: user.organizationId,
                customerId: job.customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: job.customer.email,
                subject,
                content: isFirstTimeSchedule
                  ? `Appointment scheduled for ${job.customer.firstName} ${job.customer.lastName} on ${formattedDate} ${arrivalTimeText}`
                  : `Appointment rescheduled for ${job.customer.firstName} ${job.customer.lastName} to ${formattedDate} ${arrivalTimeText}`,
                status: "SENT",
                triggeredBy: triggerKey,
              },
            })
          } catch (e) {
            console.error("Failed to send schedule notification email:", e)
          }
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to reschedule job" }
  }
}

// =============================================================================
// 10. reassignJob - Change assigned team members
// =============================================================================

export async function reassignJob(id: string, userIds: string[]) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!job) return { error: "Job not found" }

    await prisma.$transaction([
      prisma.jobAssignment.deleteMany({ where: { jobId: id } }),
      prisma.jobAssignment.createMany({
        data: userIds.map((userId) => ({ jobId: id, userId, organizationId: user.organizationId })),
      }),
    ])

    // V2 dual-write: sync visit assignments
    const visits = await prisma.visit.findMany({
      where: { jobId: id },
      select: { id: true },
    })
    if (visits.length > 0) {
      for (const visit of visits) {
        await prisma.visitAssignment.deleteMany({ where: { visitId: visit.id } })
        if (userIds.length > 0) {
          await prisma.visitAssignment.createMany({
            data: userIds.map((userId) => ({
              visitId: visit.id,
              userId,
              organizationId: user.organizationId,
            })),
          })
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to reassign job" }
  }
}

// =============================================================================
// 11. updateJob - Update an existing job's fields, line items, assignments, checklist
// =============================================================================

export async function updateJob(
  id: string,
  data: {
    customerId?: string
    propertyId?: string
    title?: string
    description?: string
    priority?: string
    scheduledStart?: string | Date
    scheduledEnd?: string | Date
    assignedUserIds?: string[]
    checklistItems?: string[]
    lineItems?: {
      serviceId?: string
      name: string
      description?: string
      quantity: number
      unitPrice: number
      taxable: boolean
    }[]
    internalNote?: string
    isRecurring?: boolean
    recurrenceRule?: string
    recurrenceEndDate?: string | Date
    arrivalWindowMinutes?: number
  }
) {
  try {
    const user = await requireAuth()

    const existing = await prisma.job.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!existing) return { error: "Job not found" }

    if (!data.title?.trim()) return { error: "Title is required" }

    await prisma.$transaction(async (tx) => {
      // Update job fields
      await tx.job.update({
        where: { id },
        data: {
          customerId: data.customerId || existing.customerId,
          propertyId: data.propertyId || null,
          title: data.title!.trim(),
          description: data.description?.trim() || null,
          priority: (data.priority as any) || existing.priority,
          scheduledStart: data.scheduledStart
            ? new Date(data.scheduledStart)
            : existing.scheduledStart,
          scheduledEnd: data.scheduledEnd
            ? new Date(data.scheduledEnd)
            : existing.scheduledEnd,
          isRecurring: data.isRecurring ?? existing.isRecurring,
          recurrenceRule: data.recurrenceRule ?? existing.recurrenceRule,
          recurrenceEndDate: data.recurrenceEndDate
            ? new Date(data.recurrenceEndDate)
            : existing.recurrenceEndDate,
          arrivalWindowMinutes: data.arrivalWindowMinutes ?? existing.arrivalWindowMinutes,
        },
      })

      // Update assignments if provided
      if (data.assignedUserIds !== undefined) {
        await tx.jobAssignment.deleteMany({ where: { jobId: id } })
        if (data.assignedUserIds.length > 0) {
          await tx.jobAssignment.createMany({
            data: data.assignedUserIds.map((userId) => ({
              jobId: id,
              userId,
              organizationId: user.organizationId,
            })),
          })
        }
      }

      // Update checklist items if provided
      if (data.checklistItems !== undefined) {
        await tx.jobChecklistItem.deleteMany({ where: { jobId: id } })
        if (data.checklistItems.length > 0) {
          await tx.jobChecklistItem.createMany({
            data: data.checklistItems.map((label, index) => ({
              jobId: id,
              label,
              sortOrder: index,
            })),
          })
        }
      }

      // Update line items if provided
      if (data.lineItems !== undefined) {
        await tx.jobLineItem.deleteMany({ where: { jobId: id } })
        if (data.lineItems.length > 0) {
          await tx.jobLineItem.createMany({
            data: data.lineItems.map((li, index) => ({
              jobId: id,
              serviceId: li.serviceId || null,
              name: li.name,
              description: li.description || null,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              total: li.quantity * li.unitPrice,
              taxable: li.taxable,
              sortOrder: index,
            })),
          })
        }
      }

      // Add internal note if provided
      if (data.internalNote?.trim()) {
        await tx.jobNote.create({
          data: {
            jobId: id,
            userId: user.id,
            content: data.internalNote.trim(),
          },
        })
      }
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateJob error:", error)
    return { error: "Failed to update job" }
  }
}

// =============================================================================
// 12. uploadJobAttachment - Upload a file attachment to a job
// =============================================================================

export async function uploadJobAttachment(jobId: string, formData: FormData) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
    })
    if (!job) return { error: "Job not found" }

    const file = formData.get("file") as File
    if (!file) return { error: "No file provided" }

    const { uploadFile } = await import("@/lib/s3")
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${Date.now()}-${sanitizedName}`
    const key = `${user.organizationId}/${jobId}/${fileName}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileUrl = await uploadFile(buffer, key, file.type)

    const attachment = await prisma.jobAttachment.create({
      data: {
        jobId,
        userId: user.id,
        fileName: file.name,
        fileUrl,
        fileType: file.type,
        fileSize: file.size,
      },
    })

    return { attachment }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("uploadJobAttachment error:", error)
    return { error: "Failed to upload file" }
  }
}

// =============================================================================
// 13. generateRecurringInstances - DEPRECATED
// Recurring jobs now cycle automatically via updateJobStatus() when completed.
// This function is no longer used. The old model of generating child job
// instances has been replaced with a single job that cycles between
// SCHEDULED and COMPLETED states.
// =============================================================================

// =============================================================================
// 13b. cancelRecurringSeries - Stop recurrence and cancel future scheduled children
// =============================================================================

export async function cancelRecurringSeries(parentJobId: string) {
  try {
    const user = await requireAuth()
    const parentJob = await prisma.job.findFirst({
      where: {
        id: parentJobId,
        organizationId: user.organizationId,
        isRecurring: true,
      },
    })
    if (!parentJob) return { error: "Recurring job not found" }

    // Stop recurring
    await prisma.job.update({
      where: { id: parentJobId },
      data: { isRecurring: false },
    })

    // Cancel all future scheduled children
    const result = await prisma.job.updateMany({
      where: {
        parentJobId: parentJobId,
        status: "SCHEDULED",
        scheduledStart: { gt: new Date() },
      },
      data: { status: "CANCELLED", cancelReason: "Recurring series cancelled" },
    })

    return { cancelled: result.count }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to cancel recurring series" }
  }
}

// =============================================================================
// 14. sendOnMyWay - Send "On My Way" notification and start job
// =============================================================================

export async function sendOnMyWay(jobId: string) {
  try {
    const user = await requireAuth()

    // Find job with customer, property, and assignments
    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
      include: {
        customer: true,
        property: true,
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })
    if (!job) return { error: "Job not found" }

    // Verify job status allows "On My Way"
    if (job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS") {
      return { error: "Job must be scheduled or in progress to send 'On My Way'" }
    }

    // Check if already sent recently (within 30 minutes)
    if (job.onMyWaySentAt) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      if (job.onMyWaySentAt > thirtyMinutesAgo) {
        return { error: "Already sent recently" }
      }
    }

    // Look up org settings
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        slug: true,
        defaultArrivalWindow: true,
        onMyWayNotificationEnabled: true,
      },
    })

    const now = new Date()
    let smsSent = false
    let emailSent = false
    const warnings: string[] = []

    // Only send notifications if the org has it enabled
    if (org?.onMyWayNotificationEnabled) {
      const customer = job.customer
      const techName = user.firstName || "Your technician"
      const orgName = org.name || "JobStream"

      // Build address string from property if available
      const address = job.property
        ? `${job.property.addressLine1}${job.property.addressLine2 ? ", " + job.property.addressLine2 : ""}, ${job.property.city}, ${job.property.state} ${job.property.zip}`
        : null

      const smsMessage = address
        ? `Hi ${customer.firstName}, ${techName} from ${orgName} is on the way! Job: ${job.title} at ${address}. See you soon!`
        : `Hi ${customer.firstName}, ${techName} from ${orgName} is on the way! Job: ${job.title}. See you soon!`

      // Check notification preferences
      const { isNotificationEnabled } = await import("@/lib/notification-check")

      // Send SMS if customer has phone and Twilio is configured
      if (await isNotificationEnabled(user.organizationId, "JOB_ON_MY_WAY", "sms")) {
        if (customer.phone && process.env.TWILIO_ACCOUNT_SID) {
          try {
            const twilio = await import("twilio")
            const client = twilio.default(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            )
            let toPhone = customer.phone.replace(/\D/g, "")
            if (toPhone.length === 10) toPhone = "1" + toPhone
            if (!toPhone.startsWith("+")) toPhone = "+" + toPhone

            await client.messages.create({
              body: smsMessage,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: toPhone,
            })

            smsSent = true

            // Log SMS communication
            await prisma.communicationLog.create({
              data: {
                organizationId: user.organizationId,
                customerId: customer.id,
                type: "SMS",
                direction: "OUTBOUND",
                recipientAddress: customer.phone,
                content: smsMessage,
                status: "SENT",
                triggeredBy: "on_my_way",
              },
            })
          } catch (e: any) {
            console.error("Failed to send On My Way SMS:", e)
            warnings.push(`SMS failed: ${e?.message || "Unknown error"}`)
          }
        }
      }

      // Send email if customer has email and SendGrid is configured
      if (await isNotificationEnabled(user.organizationId, "JOB_ON_MY_WAY", "email")) {
        if (customer.email && process.env.SENDGRID_API_KEY) {
          try {
            const sgMail = await import("@sendgrid/mail")
            sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

            const subject = `${techName} from ${orgName} is on the way!`

            const addressHtml = address
              ? ` at <strong>${address}</strong>`
              : ""

            await sgMail.default.send({
              to: customer.email,
              from: {
                email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                name: orgName,
              },
              subject,
              html: `
                <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                  <h2>Hi ${customer.firstName},</h2>
                  <p><strong>${techName}</strong> from <strong>${orgName}</strong> is on the way to you!</p>
                  <p>They'll be performing <strong>${job.title}</strong>${addressHtml}.</p>
                  <p>If you have any questions, please don't hesitate to contact us.</p>
                  <br />
                  <p style="color: #666;">- ${orgName}</p>
                </div>
              `,
            })

            emailSent = true

            // Log email communication
            await prisma.communicationLog.create({
              data: {
                organizationId: user.organizationId,
                customerId: customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: customer.email,
                subject,
                content: `On My Way notification sent to ${customer.firstName} ${customer.lastName}. ${techName} on the way for ${job.title}${address ? " at " + address : ""}.`,
                status: "SENT",
                triggeredBy: "on_my_way",
              },
            })
          } catch (e: any) {
            console.error("Failed to send On My Way email:", e)
            warnings.push(`Email failed: ${e?.message || "Unknown error"}`)
          }
        }
      }

      // Warn if customer has no contact info at all
      if (!customer.phone && !customer.email) {
        warnings.push("Customer has no contact information. No notification was sent.")
      }
    }

    // Update job: set onMyWaySentAt, transition to IN_PROGRESS, set actualStart
    const updateData: any = {
      onMyWaySentAt: now,
    }
    if (job.status === "SCHEDULED") {
      updateData.status = "IN_PROGRESS"
      updateData.actualStart = now
    }

    await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    })

    // V2 dual-write: update Visit on-my-way status
    await prisma.visit.updateMany({
      where: { jobId: jobId, status: { in: ["SCHEDULED", "EN_ROUTE"] } },
      data: {
        onMyWaySentAt: now,
        status: "EN_ROUTE",
        ...(job.status === "SCHEDULED" ? { actualStart: now } : {}),
      },
    })

    return { success: true, smsSent, emailSent, warnings }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendOnMyWay error:", error)
    return { error: "Failed to send On My Way notification" }
  }
}

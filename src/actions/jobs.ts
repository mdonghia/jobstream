"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { jobSchema } from "@/lib/validations"

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
      if (dateTo) where.scheduledStart.lte = new Date(dateTo + "T00:00:00")
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

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateJobStatus error:", error)
    return { error: "Failed to update job status" }
  }
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

    const where: any = {
      organizationId: user.organizationId,
      scheduledStart: {
        gte: new Date(params.start),
        lte: new Date(params.end),
      },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    }

    if (params.userIds && params.userIds.length > 0) {
      where.assignments = { some: { userId: { in: params.userIds } } }
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
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
      },
      orderBy: { scheduledStart: "asc" },
    })

    return { jobs }
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

    // Send email notification to the customer (best effort)
    // Skip if the new date is epoch (undo-to-unscheduled) or if there's no customer email
    const isUndoToUnscheduled = newStartDate.getTime() < new Date("2000-01-01").getTime()
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
              select: { name: true },
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

            const subject = isFirstTimeSchedule
              ? `Your appointment has been scheduled - ${org?.name}`
              : `Your appointment has been updated - ${org?.name}`

            const actionText = isFirstTimeSchedule
              ? `Your appointment has been scheduled for <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.`
              : `Your appointment has been rescheduled to <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.`

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
                  ? `Appointment scheduled for ${job.customer.firstName} ${job.customer.lastName} on ${formattedDate} at ${formattedTime}`
                  : `Appointment rescheduled for ${job.customer.firstName} ${job.customer.lastName} to ${formattedDate} at ${formattedTime}`,
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
// 13. generateRecurringInstances - Create child job instances from a recurring parent
// =============================================================================

export async function generateRecurringInstances(parentJobId: string) {
  try {
    const user = await requireAuth()

    const parentJob = await prisma.job.findFirst({
      where: {
        id: parentJobId,
        organizationId: user.organizationId,
        isRecurring: true,
      },
      include: { lineItems: true, assignments: true },
    })
    if (!parentJob) return { error: "Recurring job not found" }
    if (!parentJob.recurrenceRule) return { error: "No recurrence rule set" }

    const duration =
      parentJob.scheduledEnd.getTime() - parentJob.scheduledStart.getTime()
    const endDate = parentJob.recurrenceEndDate
      ? new Date(parentJob.recurrenceEndDate)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Default: 90 days out

    const intervalMs: Record<string, number> = {
      DAILY: 1 * 24 * 60 * 60 * 1000,
      WEEKLY: 7 * 24 * 60 * 60 * 1000,
      BIWEEKLY: 14 * 24 * 60 * 60 * 1000,
      MONTHLY: 30 * 24 * 60 * 60 * 1000,
    }
    const interval = intervalMs[parentJob.recurrenceRule] || intervalMs.WEEKLY

    // Check existing child jobs to avoid duplicates
    const existingChildren = await prisma.job.count({
      where: { parentJobId: parentJob.id },
    })
    if (existingChildren > 0) {
      return { error: "Recurring instances have already been generated" }
    }

    let created = 0
    let nextDate = new Date(parentJob.scheduledStart.getTime() + interval)

    while (nextDate <= endDate && created < 52) {
      const org = await prisma.organization.update({
        where: { id: user.organizationId },
        data: { nextJobNum: { increment: 1 } },
        select: { nextJobNum: true, jobPrefix: true },
      })

      const newJob = await prisma.job.create({
        data: {
          organizationId: user.organizationId,
          customerId: parentJob.customerId,
          propertyId: parentJob.propertyId,
          parentJobId: parentJob.id,
          jobNumber: `${org.jobPrefix}-${org.nextJobNum - 1}`,
          title: parentJob.title,
          description: parentJob.description,
          status: "SCHEDULED",
          priority: parentJob.priority,
          scheduledStart: new Date(nextDate),
          scheduledEnd: new Date(nextDate.getTime() + duration),
          isRecurring: false,
        },
      })

      // Copy assignments to child job
      if (parentJob.assignments.length > 0) {
        await prisma.jobAssignment.createMany({
          data: parentJob.assignments.map((a) => ({
            jobId: newJob.id,
            userId: a.userId,
            organizationId: user.organizationId,
          })),
        })
      }

      created++
      nextDate = new Date(nextDate.getTime() + interval)
    }

    return { created }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("generateRecurringInstances error:", error)
    return { error: "Failed to generate recurring instances" }
  }
}

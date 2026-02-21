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

    if (status && status !== "ALL") {
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
      if (dateFrom) where.scheduledStart.gte = new Date(dateFrom)
      if (dateTo) where.scheduledStart.lte = new Date(dateTo)
    }

    if (search && search.trim()) {
      where.OR = [
        { jobNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
      ]
    }

    const allowedSortFields = ["jobNumber", "scheduledStart", "priority", "createdAt"]
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "scheduledStart"

    const skip = (page - 1) * perPage

    const [total, jobs, statusCounts] = await Promise.all([
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
    ])

    const counts: Record<string, number> = {}
    statusCounts.forEach((s) => {
      counts[s.status] = s._count
    })

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

    return {
      job: {
        ...job,
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
      status: { not: "CANCELLED" },
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

    const jobs = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        scheduledStart: { lte: new Date(0) }, // Essentially unset / placeholder
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return { jobs }
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
    })
    if (!job) return { error: "Job not found" }

    await prisma.job.update({
      where: { id },
      data: {
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
      },
    })

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

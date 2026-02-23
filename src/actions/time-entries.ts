"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// Types
// =============================================================================

type GetTimeEntriesParams = {
  userId?: string
  jobId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getTimeEntries - List time entries with filters
// =============================================================================

export async function getTimeEntries(params: GetTimeEntriesParams = {}) {
  try {
    const user = await requireAuth()
    const {
      userId,
      jobId,
      dateFrom,
      dateTo,
      page = 1,
      perPage = 25,
    } = params

    const where: any = { organizationId: user.organizationId }

    if (userId) {
      where.userId = userId
    }

    if (jobId) {
      where.jobId = jobId
    }

    if (dateFrom || dateTo) {
      where.clockIn = {}
      if (dateFrom) where.clockIn.gte = new Date(dateFrom + "T00:00:00")
      if (dateTo) where.clockIn.lte = new Date(dateTo + "T00:00:00")
    }

    const skip = (page - 1) * perPage

    const [total, entries] = await Promise.all([
      prisma.timeEntry.count({ where }),
      prisma.timeEntry.findMany({
        where,
        orderBy: { clockIn: "desc" },
        skip,
        take: perPage,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
          },
          job: {
            select: { id: true, jobNumber: true, title: true },
          },
        },
      }),
    ])

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getTimeEntries error:", error)
    return { error: "Failed to fetch time entries" }
  }
}

// =============================================================================
// 2. startTimer - Create a new TimeEntry with clockIn=now, no clockOut
// =============================================================================

export async function startTimer(data: { jobId?: string; notes?: string }) {
  try {
    const user = await requireAuth()

    // Check if user already has a running timer
    const existing = await prisma.timeEntry.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        clockOut: null,
      },
    })

    if (existing) {
      return { error: "You already have a running timer. Stop it before starting a new one." }
    }

    // If jobId provided, verify it belongs to the org
    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, organizationId: user.organizationId },
      })
      if (!job) return { error: "Job not found" }
    }

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        jobId: data.jobId || null,
        clockIn: new Date(),
        notes: data.notes || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
        },
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
      },
    })

    return { entry }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("startTimer error:", error)
    return { error: "Failed to start timer" }
  }
}

// =============================================================================
// 3. stopTimer - Set clockOut=now, calculate durationMinutes
// =============================================================================

export async function stopTimer(id: string) {
  try {
    const user = await requireAuth()

    const entry = await prisma.timeEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!entry) return { error: "Time entry not found" }
    if (entry.clockOut) return { error: "Timer is already stopped" }

    const clockOut = new Date()
    const durationMinutes = Math.round(
      (clockOut.getTime() - entry.clockIn.getTime()) / 60000
    )

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        clockOut,
        durationMinutes,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
        },
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
      },
    })

    return { entry: updated }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("stopTimer error:", error)
    return { error: "Failed to stop timer" }
  }
}

// =============================================================================
// 4. discardTimer - Delete a running time entry (no clockOut)
// =============================================================================

export async function discardTimer(id: string) {
  try {
    const user = await requireAuth()

    const entry = await prisma.timeEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!entry) return { error: "Time entry not found" }
    if (entry.clockOut) return { error: "Cannot discard a completed time entry" }

    await prisma.timeEntry.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("discardTimer error:", error)
    return { error: "Failed to discard timer" }
  }
}

// =============================================================================
// 5. getActiveTimer - Find running timer for current user
// =============================================================================

export async function getActiveTimer() {
  try {
    const user = await requireAuth()

    const entry = await prisma.timeEntry.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        clockOut: null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
        },
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
      },
    })

    return { entry: entry || null }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getActiveTimer error:", error)
    return { error: "Failed to fetch active timer" }
  }
}

// =============================================================================
// 6. createManualEntry - Create a TimeEntry with explicit times
// =============================================================================

export async function createManualEntry(data: {
  date: string
  startTime: string
  endTime: string
  jobId?: string
  notes?: string
  userId?: string
}) {
  try {
    const user = await requireAuth()

    // Only admins/owners can create entries for other users
    let targetUserId = user.id
    if (data.userId && data.userId !== user.id) {
      if (user.role === "TECHNICIAN") {
        return { error: "Only admins can create time entries for other users" }
      }
      // Verify the target user belongs to the same org
      const targetUser = await prisma.user.findFirst({
        where: { id: data.userId, organizationId: user.organizationId },
      })
      if (!targetUser) return { error: "User not found" }
      targetUserId = data.userId
    }

    // If jobId provided, verify it belongs to the org
    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, organizationId: user.organizationId },
      })
      if (!job) return { error: "Job not found" }
    }

    // Build clockIn and clockOut from date + time strings
    const clockIn = new Date(`${data.date}T${data.startTime}`)
    const clockOut = new Date(`${data.date}T${data.endTime}`)

    if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) {
      return { error: "Invalid date or time format" }
    }

    if (clockOut <= clockIn) {
      return { error: "End time must be after start time" }
    }

    const durationMinutes = Math.round(
      (clockOut.getTime() - clockIn.getTime()) / 60000
    )

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: user.organizationId,
        userId: targetUserId,
        jobId: data.jobId || null,
        clockIn,
        clockOut,
        durationMinutes,
        notes: data.notes || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
        },
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
      },
    })

    return { entry }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createManualEntry error:", error)
    return { error: "Failed to create time entry" }
  }
}

// =============================================================================
// 7. updateTimeEntry - Update an existing time entry
// =============================================================================

export async function updateTimeEntry(
  id: string,
  data: {
    clockIn?: string | Date
    clockOut?: string | Date
    jobId?: string | null
    notes?: string | null
  }
) {
  try {
    const user = await requireAuth()

    const entry = await prisma.timeEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!entry) return { error: "Time entry not found" }

    // Only admins/owners can edit other users' entries
    if (entry.userId !== user.id && user.role === "TECHNICIAN") {
      return { error: "You can only edit your own time entries" }
    }

    // If jobId provided, verify it belongs to the org
    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, organizationId: user.organizationId },
      })
      if (!job) return { error: "Job not found" }
    }

    const updateData: any = {}

    if (data.clockIn !== undefined) {
      updateData.clockIn = new Date(data.clockIn)
    }
    if (data.clockOut !== undefined) {
      updateData.clockOut = data.clockOut ? new Date(data.clockOut) : null
    }
    if (data.jobId !== undefined) {
      updateData.jobId = data.jobId || null
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes
    }

    // Recalculate duration if both clockIn and clockOut are set
    const finalClockIn = updateData.clockIn || entry.clockIn
    const finalClockOut = updateData.clockOut !== undefined ? updateData.clockOut : entry.clockOut
    if (finalClockIn && finalClockOut) {
      updateData.durationMinutes = Math.round(
        (new Date(finalClockOut).getTime() - new Date(finalClockIn).getTime()) / 60000
      )
    } else if (updateData.clockOut === null) {
      updateData.durationMinutes = null
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
        },
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
      },
    })

    return { entry: updated }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateTimeEntry error:", error)
    return { error: "Failed to update time entry" }
  }
}

// =============================================================================
// 8. deleteTimeEntry - Delete a time entry
// =============================================================================

export async function deleteTimeEntry(id: string) {
  try {
    const user = await requireAuth()

    const entry = await prisma.timeEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!entry) return { error: "Time entry not found" }

    // Only admins/owners can delete other users' entries
    if (entry.userId !== user.id && user.role === "TECHNICIAN") {
      return { error: "You can only delete your own time entries" }
    }

    await prisma.timeEntry.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deleteTimeEntry error:", error)
    return { error: "Failed to delete time entry" }
  }
}

// =============================================================================
// 9. exportTimeEntries - Return all matching entries for CSV export
// =============================================================================

export async function exportTimeEntries(params: {
  userId?: string
  jobId?: string
  dateFrom?: string
  dateTo?: string
}) {
  try {
    const user = await requireAuth()

    const where: any = { organizationId: user.organizationId }

    if (params.userId) {
      where.userId = params.userId
    }

    if (params.jobId) {
      where.jobId = params.jobId
    }

    if (params.dateFrom || params.dateTo) {
      where.clockIn = {}
      if (params.dateFrom) where.clockIn.gte = new Date(params.dateFrom + "T00:00:00")
      if (params.dateTo) where.clockIn.lte = new Date(params.dateTo + "T00:00:00")
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      orderBy: { clockIn: "desc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
      },
    })

    return { entries }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("exportTimeEntries error:", error)
    return { error: "Failed to export time entries" }
  }
}

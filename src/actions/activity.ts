"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// 1. getActivityFeed - Activity events for a single job (cursor-paginated)
// =============================================================================

export async function getActivityFeed(
  jobId: string,
  params?: {
    limit?: number
    cursor?: string // id of the last event for cursor-based pagination
  }
) {
  try {
    const user = await requireAuth()

    // Verify the job belongs to this organization
    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
      select: { id: true },
    })
    if (!job) return { error: "Job not found" }

    const limit = params?.limit ?? 20

    // If a cursor is provided, find its createdAt so we can paginate from there
    let cursorFilter: { createdAt?: { lt: Date } } = {}
    if (params?.cursor) {
      const cursorEvent = await prisma.activityEvent.findUnique({
        where: { id: params.cursor },
        select: { createdAt: true },
      })
      if (cursorEvent) {
        cursorFilter = { createdAt: { lt: cursorEvent.createdAt } }
      }
    }

    // Fetch one extra record to determine if there are more pages
    const events = await prisma.activityEvent.findMany({
      where: {
        jobId,
        organizationId: user.organizationId,
        ...cursorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    const hasMore = events.length > limit
    const trimmed = hasMore ? events.slice(0, limit) : events
    const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null

    return {
      events: trimmed,
      hasMore,
      nextCursor,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getActivityFeed error:", error)
    return { error: "Failed to fetch activity feed" }
  }
}

// =============================================================================
// 2. getCustomerActivityFeed - Activity events across ALL jobs for a customer
// =============================================================================

export async function getCustomerActivityFeed(
  customerId: string,
  params?: { limit?: number }
) {
  try {
    const user = await requireAuth()

    const limit = params?.limit ?? 20

    // Fetch activity events across all of this customer's jobs using a
    // relational filter (job.customerId) so we don't need a separate query
    // to collect jobIds first.
    const events = await prisma.activityEvent.findMany({
      where: {
        organizationId: user.organizationId,
        job: { customerId },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    return { events }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCustomerActivityFeed error:", error)
    return { error: "Failed to fetch customer activity feed" }
  }
}

// =============================================================================
// 3. getRecentActivity - Recent events across ALL jobs in the organization
// =============================================================================

export async function getRecentActivity(params?: { limit?: number }) {
  try {
    const user = await requireAuth()

    const limit = params?.limit ?? 10

    const events = await prisma.activityEvent.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        job: {
          select: { id: true, jobNumber: true, title: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    return { events }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getRecentActivity error:", error)
    return { error: "Failed to fetch recent activity" }
  }
}

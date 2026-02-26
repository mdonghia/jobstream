"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns"

// =============================================================================
// Types
// =============================================================================

export type DashboardStats = {
  revenueThisMonth: number
  revenueLastMonth: number
  revenueChange: number
  jobsCompletedThisMonth: number
  jobsCompletedLastMonth: number
  jobsChange: number
  outstandingInvoices: { count: number; total: number }
  quoteConversionRate: number
}

export type RevenueChartPoint = {
  month: string
  revenue: number
}

export type JobsByStatusPoint = {
  status: string
  count: number
}

export type UpcomingJob = {
  id: string
  jobNumber: string
  title: string
  scheduledStart: string
  scheduledEnd: string
  customerName: string
}

export type ActivityEntry = {
  id: string
  entityType: string
  entityId: string
  action: string
  description: string
  createdAt: string
  userName: string | null
}

export type TodaysScheduleJob = {
  id: string
  jobNumber: string
  title: string
  status: string
  scheduledStart: string | null
  scheduledEnd: string | null
  customerName: string
  assignees: { name: string; color: string }[]
}

export type ActionRequiredData = {
  overdueInvoices: {
    id: string
    invoiceNumber: string
    amountDue: number
    dueDate: string
    customer: { firstName: string; lastName: string }
  }[]
  pendingQuotes: {
    id: string
    quoteNumber: string
    total: number
    sentAt: string | null
    customer: { firstName: string; lastName: string }
  }[]
  pendingBookings: {
    id: string
    customerName: string
    preferredDate: string | null
    service: { name: string } | null
  }[]
}

// =============================================================================
// 1. getDashboardStats
// =============================================================================

export async function getDashboardStats(): Promise<DashboardStats | { error: string }> {
  try {
    const user = await requireAuth()
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    // Revenue this month: sum of paid invoices
    const [revenueThisMonthResult, revenueLastMonthResult] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          organizationId: user.organizationId,
          status: "PAID",
          paidAt: { gte: thisMonthStart, lte: thisMonthEnd },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId: user.organizationId,
          status: "PAID",
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
    ])

    const revenueThisMonth = Number(revenueThisMonthResult._sum.total) || 0
    const revenueLastMonth = Number(revenueLastMonthResult._sum.total) || 0
    const revenueChange =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : revenueThisMonth > 0
          ? 100
          : 0

    // Jobs completed this month / last month
    const [jobsThisMonth, jobsLastMonth] = await Promise.all([
      prisma.job.count({
        where: {
          organizationId: user.organizationId,
          status: "COMPLETED",
          actualEnd: { gte: thisMonthStart, lte: thisMonthEnd },
        },
      }),
      prisma.job.count({
        where: {
          organizationId: user.organizationId,
          status: "COMPLETED",
          actualEnd: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ])

    const jobsChange =
      jobsLastMonth > 0
        ? ((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100
        : jobsThisMonth > 0
          ? 100
          : 0

    // Outstanding invoices (unpaid: SENT, VIEWED, OVERDUE, PARTIALLY_PAID)
    const outstandingResult = await prisma.invoice.aggregate({
      where: {
        organizationId: user.organizationId,
        status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"] },
      },
      _count: true,
      _sum: { amountDue: true },
    })

    // Quote conversion rate this month
    const quoteCounts = await prisma.quote.groupBy({
      by: ["status"],
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
        status: { in: ["APPROVED", "INVOICED", "DECLINED", "EXPIRED"] },
      },
      _count: true,
    })

    let approved = 0
    let totalRelevant = 0
    quoteCounts.forEach((q) => {
      if (q.status === "APPROVED" || q.status === "INVOICED") approved += q._count
      totalRelevant += q._count
    })
    const quoteConversionRate = totalRelevant > 0 ? (approved / totalRelevant) * 100 : 0

    return {
      revenueThisMonth,
      revenueLastMonth,
      revenueChange,
      jobsCompletedThisMonth: jobsThisMonth,
      jobsCompletedLastMonth: jobsLastMonth,
      jobsChange,
      outstandingInvoices: {
        count: outstandingResult._count || 0,
        total: Number(outstandingResult._sum.amountDue) || 0,
      },
      quoteConversionRate,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getDashboardStats error:", error)
    return { error: "Failed to fetch dashboard stats" }
  }
}

// =============================================================================
// 2. getRevenueChart - Monthly revenue for last 12 months
// =============================================================================

export async function getRevenueChart(): Promise<RevenueChartPoint[] | { error: string }> {
  try {
    const user = await requireAuth()
    const now = new Date()
    const months: RevenueChartPoint[] = []

    // Build 12-month range
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const monthStart = startOfMonth(monthDate)
      const monthEnd = endOfMonth(monthDate)

      const result = await prisma.invoice.aggregate({
        where: {
          organizationId: user.organizationId,
          status: "PAID",
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { total: true },
      })

      months.push({
        month: format(monthDate, "MMM yyyy"),
        revenue: Number(result._sum.total) || 0,
      })
    }

    return months
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getRevenueChart error:", error)
    return { error: "Failed to fetch revenue chart data" }
  }
}

// =============================================================================
// 3. getJobsByStatusChart - Current counts by status
// =============================================================================

export async function getJobsByStatusChart(): Promise<JobsByStatusPoint[] | { error: string }> {
  try {
    const user = await requireAuth()

    const statusCounts = await prisma.job.groupBy({
      by: ["status"],
      where: { organizationId: user.organizationId },
      _count: true,
    })

    const allStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    const countsMap: Record<string, number> = {}
    statusCounts.forEach((s) => {
      countsMap[s.status] = s._count
    })

    return allStatuses.map((status) => ({
      status,
      count: countsMap[status] || 0,
    }))
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJobsByStatusChart error:", error)
    return { error: "Failed to fetch jobs by status" }
  }
}

// =============================================================================
// 4. getUpcomingJobs - Next 5 upcoming scheduled jobs
// =============================================================================

export async function getUpcomingJobs(): Promise<UpcomingJob[] | { error: string }> {
  try {
    const user = await requireAuth()

    const jobs = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        scheduledStart: { gte: new Date() },
      },
      orderBy: { scheduledStart: "asc" },
      take: 5,
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    return jobs.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      scheduledStart: job.scheduledStart.toISOString(),
      scheduledEnd: job.scheduledEnd.toISOString(),
      customerName: `${job.customer.firstName} ${job.customer.lastName}`,
    }))
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getUpcomingJobs error:", error)
    return { error: "Failed to fetch upcoming jobs" }
  }
}

// =============================================================================
// 5. getRecentActivity - Last 20 activity log entries
// =============================================================================

export async function getRecentActivity(): Promise<ActivityEntry[] | { error: string }> {
  try {
    const user = await requireAuth()

    const logs = await prisma.activityLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    return logs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      description: log.description,
      createdAt: log.createdAt.toISOString(),
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : null,
    }))
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getRecentActivity error:", error)
    return { error: "Failed to fetch recent activity" }
  }
}

// =============================================================================
// 6. getTodaysSchedule - Jobs scheduled for today
// =============================================================================

export async function getTodaysSchedule(): Promise<TodaysScheduleJob[] | { error: string }> {
  try {
    const user = await requireAuth()
    const today = new Date()
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    const jobs = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        scheduledStart: { gte: dayStart, lte: dayEnd },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      orderBy: { scheduledStart: "asc" },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        assignments: {
          include: { user: { select: { firstName: true, lastName: true, color: true } } },
        },
      },
      take: 20,
    })

    return jobs.map((j) => ({
      id: j.id,
      jobNumber: j.jobNumber,
      title: j.title,
      status: j.status,
      scheduledStart: j.scheduledStart?.toISOString() ?? null,
      scheduledEnd: j.scheduledEnd?.toISOString() ?? null,
      customerName: `${j.customer.firstName} ${j.customer.lastName}`,
      assignees: j.assignments.map((a) => ({
        name: `${a.user.firstName} ${a.user.lastName}`,
        color: a.user.color,
      })),
    }))
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getTodaysSchedule error:", error)
    return { error: "Failed to fetch today's schedule" }
  }
}

// =============================================================================
// 7. getActionRequired - Overdue invoices, pending quotes, pending bookings
// =============================================================================

export async function getActionRequired(): Promise<ActionRequiredData | { error: string }> {
  try {
    const user = await requireAuth()

    const [overdueInvoices, pendingQuotes, pendingBookings] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId: user.organizationId, status: "OVERDUE" },
        select: {
          id: true,
          invoiceNumber: true,
          amountDue: true,
          dueDate: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.quote.findMany({
        where: { organizationId: user.organizationId, status: "SENT" },
        select: {
          id: true,
          quoteNumber: true,
          total: true,
          sentAt: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { sentAt: "asc" },
        take: 5,
      }),
      prisma.booking.findMany({
        where: { organizationId: user.organizationId, status: "PENDING" },
        select: {
          id: true,
          customerName: true,
          preferredDate: true,
          service: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
    ])

    return {
      overdueInvoices: overdueInvoices.map((i) => ({
        ...i,
        amountDue: Number(i.amountDue),
        dueDate: i.dueDate.toISOString(),
      })),
      pendingQuotes: pendingQuotes.map((q) => ({
        ...q,
        total: Number(q.total),
        sentAt: q.sentAt?.toISOString() ?? null,
      })),
      pendingBookings: pendingBookings.map((b) => ({
        ...b,
        preferredDate: b.preferredDate?.toISOString() ?? null,
      })),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getActionRequired error:", error)
    return { error: "Failed to fetch action required data" }
  }
}

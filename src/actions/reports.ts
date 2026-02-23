"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import {
  startOfMonth,
  endOfMonth,
  format,
  differenceInMinutes,
  eachMonthOfInterval,
} from "date-fns"

// =============================================================================
// Types
// =============================================================================

export type RevenueReportResult = {
  summary: {
    totalRevenue: number
    avgPerJob: number
    largestInvoice: number
  }
  revenueByMonth: { month: string; revenue: number }[]
  revenueByCategory: { category: string; revenue: number; count: number }[]
  revenueByCustomer: { customerId: string; customerName: string; revenue: number; jobCount: number }[]
}

export type JobsReportResult = {
  summary: {
    total: number
    completed: number
    cancelled: number
    avgCompletionMinutes: number
  }
  jobsByMonth: { month: string; completed: number; cancelled: number }[]
  jobsByServiceType: { service: string; count: number }[]
  jobsByTeamMember: { userId: string; name: string; count: number }[]
}

export type QuotesReportResult = {
  summary: {
    sent: number
    approved: number
    declined: number
    expired: number
    conversionRate: number
  }
  conversionByMonth: { month: string; sent: number; approved: number; rate: number }[]
  quotesByStatus: { status: string; count: number; total: number }[]
}

export type TeamReportResult = {
  members: {
    userId: string
    name: string
    hoursWorked: number
    jobsCompleted: number
    revenueGenerated: number
  }[]
}

export type CustomersReportResult = {
  summary: {
    total: number
    newThisPeriod: number
    active: number
    inactive: number
  }
  newByMonth: { month: string; count: number }[]
  topCustomers: {
    customerId: string
    customerName: string
    totalRevenue: number
    jobCount: number
    lastJobDate: string | null
  }[]
}

type DateRange = {
  dateFrom: string
  dateTo: string
}

// =============================================================================
// Helper: Parse date range params
// =============================================================================

function parseDateRange(params: DateRange) {
  const parseLocalStart = (s: string) => s.length === 10 ? new Date(s + "T00:00:00") : new Date(s)
  const parseLocalEnd = (s: string) => s.length === 10 ? new Date(s + "T23:59:59") : new Date(s)
  return {
    from: parseLocalStart(params.dateFrom),
    to: parseLocalEnd(params.dateTo),
  }
}

// =============================================================================
// Helper: Generate month intervals for the given date range
// =============================================================================

function getMonthIntervals(from: Date, to: Date) {
  const months = eachMonthOfInterval({ start: from, end: to })
  return months.map((monthDate) => ({
    label: format(monthDate, "MMM yyyy"),
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  }))
}

// =============================================================================
// 1. getRevenueReport
// =============================================================================

export async function getRevenueReport(params: DateRange): Promise<RevenueReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    // Summary
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PAID",
        paidAt: { gte: from, lte: to },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        lineItems: {
          include: { service: { select: { category: true } } },
        },
        job: { select: { id: true } },
      },
    })

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const jobIds = new Set(paidInvoices.filter((i) => i.jobId).map((i) => i.jobId))
    const avgPerJob = jobIds.size > 0 ? totalRevenue / jobIds.size : 0
    const largestInvoice = paidInvoices.length > 0
      ? Math.max(...paidInvoices.map((inv) => Number(inv.total)))
      : 0

    // Revenue by month
    const monthIntervals = getMonthIntervals(from, to)
    const revenueByMonth = monthIntervals.map((m) => {
      const monthRevenue = paidInvoices
        .filter((inv) => inv.paidAt && inv.paidAt >= m.start && inv.paidAt <= m.end)
        .reduce((sum, inv) => sum + Number(inv.total), 0)
      return { month: m.label, revenue: monthRevenue }
    })

    // Revenue by category (from line items)
    const categoryMap: Record<string, { revenue: number; count: number }> = {}
    paidInvoices.forEach((inv) => {
      inv.lineItems.forEach((li) => {
        const cat = li.service?.category || "Uncategorized"
        if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, count: 0 }
        categoryMap[cat].revenue += Number(li.total)
        categoryMap[cat].count += 1
      })
    })
    const revenueByCategory = Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    // Revenue by customer (top 20)
    const customerMap: Record<string, { customerName: string; revenue: number; jobCount: number }> = {}
    paidInvoices.forEach((inv) => {
      const custId = inv.customer.id
      if (!customerMap[custId]) {
        customerMap[custId] = {
          customerName: `${inv.customer.firstName} ${inv.customer.lastName}`,
          revenue: 0,
          jobCount: 0,
        }
      }
      customerMap[custId].revenue += Number(inv.total)
      if (inv.jobId) customerMap[custId].jobCount += 1
    })
    const revenueByCustomer = Object.entries(customerMap)
      .map(([customerId, data]) => ({ customerId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)

    return {
      summary: { totalRevenue, avgPerJob, largestInvoice },
      revenueByMonth,
      revenueByCategory,
      revenueByCustomer,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getRevenueReport error:", error)
    return { error: "Failed to generate revenue report" }
  }
}

// =============================================================================
// 2. getJobsReport
// =============================================================================

export async function getJobsReport(params: DateRange): Promise<JobsReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    // All jobs in period
    const jobs = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        lineItems: {
          include: { service: { select: { name: true } } },
        },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    const completed = jobs.filter((j) => j.status === "COMPLETED")
    const cancelled = jobs.filter((j) => j.status === "CANCELLED")

    // Average completion time
    const completionTimes = completed
      .filter((j) => j.actualStart && j.actualEnd)
      .map((j) => differenceInMinutes(j.actualEnd!, j.actualStart!))
    const avgCompletionMinutes =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
        : 0

    // Jobs by month
    const monthIntervals = getMonthIntervals(from, to)
    const jobsByMonth = monthIntervals.map((m) => {
      const monthJobs = jobs.filter(
        (j) => j.createdAt >= m.start && j.createdAt <= m.end
      )
      return {
        month: m.label,
        completed: monthJobs.filter((j) => j.status === "COMPLETED").length,
        cancelled: monthJobs.filter((j) => j.status === "CANCELLED").length,
      }
    })

    // Jobs by service type (from line items)
    const serviceMap: Record<string, number> = {}
    jobs.forEach((job) => {
      job.lineItems.forEach((li) => {
        const name = li.service?.name || li.name
        serviceMap[name] = (serviceMap[name] || 0) + 1
      })
    })
    const jobsByServiceType = Object.entries(serviceMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)

    // Jobs by team member
    const memberMap: Record<string, { name: string; count: number }> = {}
    jobs.forEach((job) => {
      job.assignments.forEach((a) => {
        if (!memberMap[a.user.id]) {
          memberMap[a.user.id] = {
            name: `${a.user.firstName} ${a.user.lastName}`,
            count: 0,
          }
        }
        memberMap[a.user.id].count += 1
      })
    })
    const jobsByTeamMember = Object.entries(memberMap)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)

    return {
      summary: {
        total: jobs.length,
        completed: completed.length,
        cancelled: cancelled.length,
        avgCompletionMinutes: Math.round(avgCompletionMinutes),
      },
      jobsByMonth,
      jobsByServiceType,
      jobsByTeamMember,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJobsReport error:", error)
    return { error: "Failed to generate jobs report" }
  }
}

// =============================================================================
// 3. getQuotesReport
// =============================================================================

export async function getQuotesReport(params: DateRange): Promise<QuotesReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    const quotes = await prisma.quote.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
      },
    })

    const sent = quotes.filter((q) => q.status !== "DRAFT").length
    const approved = quotes.filter((q) => q.status === "APPROVED" || q.status === "CONVERTED").length
    const declined = quotes.filter((q) => q.status === "DECLINED").length
    const expired = quotes.filter((q) => q.status === "EXPIRED").length
    const relevantTotal = approved + declined + expired
    const conversionRate = relevantTotal > 0 ? (approved / relevantTotal) * 100 : 0

    // Conversion by month
    const monthIntervals = getMonthIntervals(from, to)
    const conversionByMonth = monthIntervals.map((m) => {
      const monthQuotes = quotes.filter(
        (q) => q.createdAt >= m.start && q.createdAt <= m.end
      )
      const mSent = monthQuotes.filter((q) => q.status !== "DRAFT").length
      const mApproved = monthQuotes.filter(
        (q) => q.status === "APPROVED" || q.status === "CONVERTED"
      ).length
      const mDeclined = monthQuotes.filter((q) => q.status === "DECLINED").length
      const mExpired = monthQuotes.filter((q) => q.status === "EXPIRED").length
      const mTotal = mApproved + mDeclined + mExpired
      return {
        month: m.label,
        sent: mSent,
        approved: mApproved,
        rate: mTotal > 0 ? Math.round((mApproved / mTotal) * 100) : 0,
      }
    })

    // Quotes by status
    const statusMap: Record<string, { count: number; total: number }> = {}
    quotes.forEach((q) => {
      if (!statusMap[q.status]) statusMap[q.status] = { count: 0, total: 0 }
      statusMap[q.status].count += 1
      statusMap[q.status].total += Number(q.total)
    })
    const quotesByStatus = Object.entries(statusMap)
      .map(([status, data]) => ({ status, ...data }))
      .sort((a, b) => b.count - a.count)

    return {
      summary: { sent, approved, declined, expired, conversionRate },
      conversionByMonth,
      quotesByStatus,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getQuotesReport error:", error)
    return { error: "Failed to generate quotes report" }
  }
}

// =============================================================================
// 4. getTeamReport
// =============================================================================

export async function getTeamReport(params: DateRange): Promise<TeamReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    // Get all team members
    const teamMembers = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    })

    const members = await Promise.all(
      teamMembers.map(async (member) => {
        // Hours worked from TimeEntry
        const timeEntries = await prisma.timeEntry.findMany({
          where: {
            organizationId: user.organizationId,
            userId: member.id,
            clockIn: { gte: from, lte: to },
          },
        })

        const totalMinutes = timeEntries.reduce(
          (sum, te) => sum + (te.durationMinutes || 0),
          0
        )

        // Jobs completed
        const jobsCompleted = await prisma.jobAssignment.count({
          where: {
            organizationId: user.organizationId,
            userId: member.id,
            job: {
              status: "COMPLETED",
              actualEnd: { gte: from, lte: to },
            },
          },
        })

        // Revenue generated (from invoices on jobs this member was assigned to)
        const assignedJobs = await prisma.jobAssignment.findMany({
          where: {
            organizationId: user.organizationId,
            userId: member.id,
            job: {
              actualEnd: { gte: from, lte: to },
            },
          },
          select: { jobId: true },
        })

        const jobIds = assignedJobs.map((a) => a.jobId)
        let revenueGenerated = 0
        if (jobIds.length > 0) {
          const invoicesResult = await prisma.invoice.aggregate({
            where: {
              organizationId: user.organizationId,
              jobId: { in: jobIds },
              status: "PAID",
            },
            _sum: { total: true },
          })
          revenueGenerated = Number(invoicesResult._sum.total) || 0
        }

        return {
          userId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          hoursWorked: Math.round((totalMinutes / 60) * 10) / 10,
          jobsCompleted,
          revenueGenerated,
        }
      })
    )

    return { members: members.sort((a, b) => b.hoursWorked - a.hoursWorked) }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getTeamReport error:", error)
    return { error: "Failed to generate team report" }
  }
}

// =============================================================================
// 5. getCustomersReport
// =============================================================================

export async function getCustomersReport(params: DateRange): Promise<CustomersReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    // Total customers
    const total = await prisma.customer.count({
      where: { organizationId: user.organizationId },
    })

    // New customers this period
    const newThisPeriod = await prisma.customer.count({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
      },
    })

    // Active = has a job in the period
    const activeCustomerIds = await prisma.job.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    })
    const active = activeCustomerIds.length
    const inactive = total - active

    // New by month
    const monthIntervals = getMonthIntervals(from, to)
    const newByMonth = await Promise.all(
      monthIntervals.map(async (m) => {
        const count = await prisma.customer.count({
          where: {
            organizationId: user.organizationId,
            createdAt: { gte: m.start, lte: m.end },
          },
        })
        return { month: m.label, count }
      })
    )

    // Top customers by lifetime revenue
    const allInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PAID",
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        job: { select: { scheduledStart: true } },
      },
    })

    const customerRevMap: Record<
      string,
      { name: string; revenue: number; jobCount: number; lastJobDate: Date | null }
    > = {}
    allInvoices.forEach((inv) => {
      const cid = inv.customer.id
      if (!customerRevMap[cid]) {
        customerRevMap[cid] = {
          name: `${inv.customer.firstName} ${inv.customer.lastName}`,
          revenue: 0,
          jobCount: 0,
          lastJobDate: null,
        }
      }
      customerRevMap[cid].revenue += Number(inv.total)
      if (inv.jobId) customerRevMap[cid].jobCount += 1
      if (inv.job?.scheduledStart) {
        if (
          !customerRevMap[cid].lastJobDate ||
          inv.job.scheduledStart > customerRevMap[cid].lastJobDate!
        ) {
          customerRevMap[cid].lastJobDate = inv.job.scheduledStart
        }
      }
    })

    const topCustomers = Object.entries(customerRevMap)
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        totalRevenue: data.revenue,
        jobCount: data.jobCount,
        lastJobDate: data.lastJobDate ? data.lastJobDate.toISOString() : null,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20)

    return {
      summary: { total, newThisPeriod, active, inactive },
      newByMonth,
      topCustomers,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCustomersReport error:", error)
    return { error: "Failed to generate customers report" }
  }
}

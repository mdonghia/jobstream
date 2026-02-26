"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
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

export type InvoicesReportResult = {
  summary: {
    totalInvoices: number
    totalAmount: number
    totalPaid: number
    totalOutstanding: number
  }
  invoices: {
    id: string
    invoiceNumber: string
    customerName: string
    jobNumber: string | null
    amount: number
    dueDate: string
    status: string
    paidAt: string | null
  }[]
}

export type PaymentsReportResult = {
  summary: {
    totalPayments: number
    totalAmount: number
    byMethod: { method: string; count: number; amount: number }[]
  }
  payments: {
    id: string
    paymentDate: string
    invoiceNumber: string
    customerName: string
    amount: number
    method: string
    status: string
  }[]
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

export type TeamReportResult = {
  members: {
    userId: string
    name: string
    hoursWorked: number
    jobsCompleted: number
    revenueGenerated: number
  }[]
}

export type TimeTrackingReportResult = {
  summary: {
    totalHours: number
    totalDays: number
    avgHoursPerDay: number
  }
  entries: {
    userId: string
    name: string
    date: string
    startTime: string | null
    endTime: string | null
    totalMinutes: number
    totalHours: number
  }[]
}

export type ScheduleReportInput = {
  reportType: string
  frequency: string
  dayOfWeek?: number
  dayOfMonth?: number
  emails: string[]
}

export type ReportScheduleItem = {
  id: string
  reportType: string
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  emails: string[]
  isActive: boolean
  createdAt: string
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
// 1. getRevenueReport (used by the Invoices tab for revenue chart data)
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
// 2. getInvoicesReport (individual invoice listing)
// =============================================================================

export async function getInvoicesReport(params: DateRange): Promise<InvoicesReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        job: { select: { jobNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const totalPaid = invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + Number(inv.total), 0)
    const totalOutstanding = invoices
      .filter((inv) => !["PAID", "VOID"].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.amountDue), 0)

    return {
      summary: {
        totalInvoices,
        totalAmount,
        totalPaid,
        totalOutstanding,
      },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: `${inv.customer.firstName} ${inv.customer.lastName}`,
        jobNumber: inv.job?.jobNumber || null,
        amount: Number(inv.total),
        dueDate: inv.dueDate.toISOString(),
        status: inv.status,
        paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      })),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getInvoicesReport error:", error)
    return { error: "Failed to generate invoices report" }
  }
}

// =============================================================================
// 3. getPaymentsReport
// =============================================================================

export async function getPaymentsReport(params: DateRange): Promise<PaymentsReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    const payments = await prisma.payment.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const totalPayments = payments.length
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Group by method
    const methodMap: Record<string, { count: number; amount: number }> = {}
    payments.forEach((p) => {
      if (!methodMap[p.method]) methodMap[p.method] = { count: 0, amount: 0 }
      methodMap[p.method].count += 1
      methodMap[p.method].amount += Number(p.amount)
    })
    const byMethod = Object.entries(methodMap)
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.amount - a.amount)

    return {
      summary: { totalPayments, totalAmount, byMethod },
      payments: payments.map((p) => ({
        id: p.id,
        paymentDate: (p.processedAt || p.createdAt).toISOString(),
        invoiceNumber: p.invoice.invoiceNumber,
        customerName: `${p.invoice.customer.firstName} ${p.invoice.customer.lastName}`,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
      })),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getPaymentsReport error:", error)
    return { error: "Failed to generate payments report" }
  }
}

// =============================================================================
// 4. getJobsReport
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
// 5. getTeamReport (Team Activity)
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
// 6. getTimeTrackingReport
// =============================================================================

export async function getTimeTrackingReport(params: DateRange): Promise<TimeTrackingReportResult | { error: string }> {
  try {
    const user = await requireAuth()
    const { from, to } = parseDateRange(params)

    // Get visits with actual time data within the date range
    const visits = await prisma.visit.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { actualStart: { gte: from, lte: to } },
          { actualEnd: { gte: from, lte: to } },
        ],
      },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    // Build a map: userId -> date -> { earliestStart, latestEnd }
    const trackingMap: Record<string, {
      name: string
      dates: Record<string, { earliestStart: Date | null; latestEnd: Date | null }>
    }> = {}

    visits.forEach((visit) => {
      if (!visit.actualStart && !visit.actualEnd) return

      visit.assignments.forEach((assignment) => {
        const uid = assignment.user.id
        const name = `${assignment.user.firstName} ${assignment.user.lastName}`

        if (!trackingMap[uid]) {
          trackingMap[uid] = { name, dates: {} }
        }

        // Use actualStart date as the day key, fall back to actualEnd
        const dayDate = visit.actualStart || visit.actualEnd!
        const dateKey = format(startOfDay(dayDate), "yyyy-MM-dd")

        if (!trackingMap[uid].dates[dateKey]) {
          trackingMap[uid].dates[dateKey] = { earliestStart: null, latestEnd: null }
        }

        const entry = trackingMap[uid].dates[dateKey]
        if (visit.actualStart) {
          if (!entry.earliestStart || visit.actualStart < entry.earliestStart) {
            entry.earliestStart = visit.actualStart
          }
        }
        if (visit.actualEnd) {
          if (!entry.latestEnd || visit.actualEnd > entry.latestEnd) {
            entry.latestEnd = visit.actualEnd
          }
        }
      })
    })

    // Also include TimeEntry records for broader coverage
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        organizationId: user.organizationId,
        clockIn: { gte: from, lte: to },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    timeEntries.forEach((te) => {
      const uid = te.user.id
      const name = `${te.user.firstName} ${te.user.lastName}`

      if (!trackingMap[uid]) {
        trackingMap[uid] = { name, dates: {} }
      }

      const dateKey = format(startOfDay(te.clockIn), "yyyy-MM-dd")

      if (!trackingMap[uid].dates[dateKey]) {
        trackingMap[uid].dates[dateKey] = { earliestStart: null, latestEnd: null }
      }

      const entry = trackingMap[uid].dates[dateKey]
      if (!entry.earliestStart || te.clockIn < entry.earliestStart) {
        entry.earliestStart = te.clockIn
      }
      if (te.clockOut) {
        if (!entry.latestEnd || te.clockOut > entry.latestEnd) {
          entry.latestEnd = te.clockOut
        }
      }
    })

    // Flatten into entries array
    const entries: TimeTrackingReportResult["entries"] = []
    let totalMinutesAll = 0
    const allDates = new Set<string>()

    Object.entries(trackingMap).forEach(([userId, data]) => {
      Object.entries(data.dates).forEach(([date, times]) => {
        let totalMinutes = 0
        if (times.earliestStart && times.latestEnd) {
          totalMinutes = Math.max(0, differenceInMinutes(times.latestEnd, times.earliestStart))
        }
        totalMinutesAll += totalMinutes
        allDates.add(date)

        entries.push({
          userId,
          name: data.name,
          date,
          startTime: times.earliestStart ? times.earliestStart.toISOString() : null,
          endTime: times.latestEnd ? times.latestEnd.toISOString() : null,
          totalMinutes,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        })
      })
    })

    // Sort by date descending, then by name
    entries.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return a.name.localeCompare(b.name)
    })

    const totalHours = Math.round((totalMinutesAll / 60) * 10) / 10
    const totalDays = allDates.size
    const avgHoursPerDay = totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0

    return {
      summary: { totalHours, totalDays, avgHoursPerDay },
      entries,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getTimeTrackingReport error:", error)
    return { error: "Failed to generate time tracking report" }
  }
}

// =============================================================================
// 7. scheduleReport
// =============================================================================

export async function scheduleReport(input: ScheduleReportInput): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireAuth()

    if (!input.reportType || !input.frequency || !input.emails.length) {
      return { error: "Report type, frequency, and at least one email are required" }
    }

    const validTypes = ["invoices", "payments", "jobs", "team_activity", "time_tracking"]
    if (!validTypes.includes(input.reportType)) {
      return { error: "Invalid report type" }
    }

    if (!["weekly", "monthly"].includes(input.frequency)) {
      return { error: "Frequency must be weekly or monthly" }
    }

    if (input.frequency === "weekly" && (input.dayOfWeek === undefined || input.dayOfWeek < 0 || input.dayOfWeek > 6)) {
      return { error: "Day of week (0-6) is required for weekly schedules" }
    }

    if (input.frequency === "monthly" && (input.dayOfMonth === undefined || input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
      return { error: "Day of month (1-31) is required for monthly schedules" }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const email of input.emails) {
      if (!emailRegex.test(email.trim())) {
        return { error: `Invalid email address: ${email}` }
      }
    }

    await prisma.reportSchedule.create({
      data: {
        organizationId: user.organizationId,
        reportType: input.reportType,
        frequency: input.frequency,
        dayOfWeek: input.frequency === "weekly" ? input.dayOfWeek! : null,
        dayOfMonth: input.frequency === "monthly" ? input.dayOfMonth! : null,
        emails: input.emails.map((e) => e.trim()),
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("scheduleReport error:", error)
    return { error: "Failed to schedule report" }
  }
}

// =============================================================================
// 8. getReportSchedules
// =============================================================================

export async function getReportSchedules(): Promise<ReportScheduleItem[] | { error: string }> {
  try {
    const user = await requireAuth()

    const schedules = await prisma.reportSchedule.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return schedules.map((s) => ({
      id: s.id,
      reportType: s.reportType,
      frequency: s.frequency,
      dayOfWeek: s.dayOfWeek,
      dayOfMonth: s.dayOfMonth,
      emails: s.emails,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
    }))
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getReportSchedules error:", error)
    return { error: "Failed to fetch report schedules" }
  }
}

// =============================================================================
// 9. deleteReportSchedule
// =============================================================================

export async function deleteReportSchedule(scheduleId: string): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireAuth()

    await prisma.reportSchedule.deleteMany({
      where: {
        id: scheduleId,
        organizationId: user.organizationId,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deleteReportSchedule error:", error)
    return { error: "Failed to delete report schedule" }
  }
}

// =============================================================================
// 10. updateReportSchedule
// =============================================================================

export async function updateReportSchedule(
  scheduleId: string,
  input: ScheduleReportInput
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireAuth()

    if (!input.reportType || !input.frequency || !input.emails.length) {
      return { error: "Report type, frequency, and at least one email are required" }
    }

    const validTypes = ["invoices", "payments", "jobs", "team_activity", "time_tracking"]
    if (!validTypes.includes(input.reportType)) {
      return { error: "Invalid report type" }
    }

    if (!["weekly", "monthly"].includes(input.frequency)) {
      return { error: "Frequency must be weekly or monthly" }
    }

    if (input.frequency === "weekly" && (input.dayOfWeek === undefined || input.dayOfWeek < 0 || input.dayOfWeek > 6)) {
      return { error: "Day of week (0-6) is required for weekly schedules" }
    }

    if (input.frequency === "monthly" && (input.dayOfMonth === undefined || input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
      return { error: "Day of month (1-31) is required for monthly schedules" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const email of input.emails) {
      if (!emailRegex.test(email.trim())) {
        return { error: `Invalid email address: ${email}` }
      }
    }

    const result = await prisma.reportSchedule.updateMany({
      where: {
        id: scheduleId,
        organizationId: user.organizationId,
      },
      data: {
        reportType: input.reportType,
        frequency: input.frequency,
        dayOfWeek: input.frequency === "weekly" ? input.dayOfWeek! : null,
        dayOfMonth: input.frequency === "monthly" ? input.dayOfMonth! : null,
        emails: input.emails.map((e) => e.trim()),
      },
    })

    if (result.count === 0) {
      return { error: "Schedule not found" }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateReportSchedule error:", error)
    return { error: "Failed to update report schedule" }
  }
}

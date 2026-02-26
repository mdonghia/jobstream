"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { computeJobFilterTab } from "@/lib/job-filter-tab"
import { todayBoundsInTz, daysAgoInTz } from "@/lib/timezone"

// =============================================================================
// Types
// =============================================================================

export type DashboardV2Stats = {
  // Action Items
  unscheduledJobsCount: number
  needsInvoicingCount: number
  expiredQuotesCount: number
  overdueInvoicesCount: number

  // Today's Progress
  visitsScheduledToday: number
  visitsCompletedToday: number

  // Revenue
  revenuePastWeek: number
  revenuePastMonth: number
  revenuePastYear: number

  // Visits Completed
  visitsCompletedPastWeek: number
  visitsCompletedPastMonth: number
  visitsCompletedPastYear: number
}

// =============================================================================
// getDashboardV2Stats
// =============================================================================

export async function getDashboardV2Stats(): Promise<
  DashboardV2Stats | { error: string }
> {
  try {
    const user = await requireAuth()
    const orgId = user.organizationId
    const now = new Date()

    // Fetch the org's timezone so "today" matches the user's local time
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { timezone: true },
    })
    const tz = org?.timezone || "America/New_York"

    const { dayStart, dayEnd } = todayBoundsInTz(tz)
    const start7d = daysAgoInTz(7, tz)
    const start30d = daysAgoInTz(30, tz)
    const start365d = daysAgoInTz(365, tz)

    const [
      // 1. Unscheduled Jobs: jobs with at least one visit where
      //    status = UNSCHEDULED
      unscheduledJobsCount,

      // 2. Needs Invoicing: uses computeJobFilterTab for consistency with Jobs page
      needsInvoicingCandidates,

      // 3. Overdue Quotes: quotes with status SENT and validUntil < now
      expiredQuotesCount,

      // 4. Overdue Invoices: invoices with status SENT and dueDate < now
      overdueInvoicesCount,

      // 5. Today's visits -- scheduled today
      visitsScheduledToday,

      // 6. Today's visits -- completed today
      visitsCompletedToday,

      // 7-9. Revenue from payments in last 7d, 30d, 365d
      revenue7d,
      revenue30d,
      revenue365d,

      // 10-12. Visit completion counts in last 7d, 30d, 365d
      visitsCompleted7d,
      visitsCompleted30d,
      visitsCompleted365d,
    ] = await Promise.all([
      // 1. Unscheduled Jobs (exclude archived customers)
      prisma.job.count({
        where: {
          organizationId: orgId,
          customer: { isArchived: false },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          visits: {
            some: {
              status: "UNSCHEDULED",
            },
          },
        },
      }),

      // 2. Needs Invoicing -- fetch candidate jobs (all visits completed/cancelled,
      //    at least one completed) and classify with computeJobFilterTab to match
      //    the Jobs page filter exactly. Excludes archived customers.
      prisma.job.findMany({
        where: {
          organizationId: orgId,
          customer: { isArchived: false },
          visits: {
            every: { status: { in: ["COMPLETED", "CANCELLED"] } },
            some: { status: "COMPLETED" },
          },
        },
        select: {
          isRecurring: true,
          visits: { select: { status: true } },
          quote: { select: { status: true } },
          quotesInContext: { select: { status: true } },
          invoices: { select: { status: true, amountDue: true } },
        },
      }),

      // 3. Overdue Quotes (exclude archived customers)
      prisma.quote.count({
        where: {
          organizationId: orgId,
          customer: { isArchived: false },
          status: "SENT",
          validUntil: { lt: now },
        },
      }),

      // 4. Overdue Invoices (exclude archived customers)
      prisma.invoice.count({
        where: {
          organizationId: orgId,
          customer: { isArchived: false },
          status: "SENT",
          dueDate: { lt: now },
        },
      }),

      // 5. Visits scheduled today (exclude archived customers, cancelled, unassigned)
      prisma.visit.count({
        where: {
          organizationId: orgId,
          job: { customer: { isArchived: false } },
          scheduledStart: { gte: dayStart, lte: dayEnd },
          status: { not: "CANCELLED" },
          assignments: { some: {} },
        },
      }),

      // 6. Visits completed today (exclude archived customers)
      prisma.visit.count({
        where: {
          organizationId: orgId,
          job: { customer: { isArchived: false } },
          status: "COMPLETED",
          actualEnd: { gte: dayStart, lte: dayEnd },
        },
      }),

      // 7. Revenue past week (exclude archived customers)
      prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          invoice: { customer: { isArchived: false } },
          status: "COMPLETED",
          processedAt: { gte: start7d },
        },
        _sum: { amount: true },
      }),

      // 8. Revenue past month (exclude archived customers)
      prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          invoice: { customer: { isArchived: false } },
          status: "COMPLETED",
          processedAt: { gte: start30d },
        },
        _sum: { amount: true },
      }),

      // 9. Revenue past year (exclude archived customers)
      prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          invoice: { customer: { isArchived: false } },
          status: "COMPLETED",
          processedAt: { gte: start365d },
        },
        _sum: { amount: true },
      }),

      // 10. Visits completed past week (exclude archived customers)
      prisma.visit.count({
        where: {
          organizationId: orgId,
          job: { customer: { isArchived: false } },
          status: "COMPLETED",
          actualEnd: { gte: start7d },
        },
      }),

      // 11. Visits completed past month (exclude archived customers)
      prisma.visit.count({
        where: {
          organizationId: orgId,
          job: { customer: { isArchived: false } },
          status: "COMPLETED",
          actualEnd: { gte: start30d },
        },
      }),

      // 12. Visits completed past year (exclude archived customers)
      prisma.visit.count({
        where: {
          organizationId: orgId,
          job: { customer: { isArchived: false } },
          status: "COMPLETED",
          actualEnd: { gte: start365d },
        },
      }),
    ])

    // Classify candidate jobs using the same logic as the Jobs page filter
    const needsInvoicingCount = needsInvoicingCandidates.filter((job) => {
      const tab = computeJobFilterTab({
        isRecurring: job.isRecurring,
        visits: job.visits.map((v) => ({ status: v.status })),
        quotesInContext: job.quotesInContext.map((q) => ({ status: q.status })),
        quote: job.quote ? { status: job.quote.status } : null,
        invoices: job.invoices.map((inv) => ({ status: inv.status, amountDue: inv.amountDue })),
      })
      return tab === "needs_invoicing"
    }).length

    return {
      unscheduledJobsCount,
      needsInvoicingCount,
      expiredQuotesCount,
      overdueInvoicesCount,
      visitsScheduledToday,
      visitsCompletedToday,
      revenuePastWeek: Number(revenue7d._sum.amount) || 0,
      revenuePastMonth: Number(revenue30d._sum.amount) || 0,
      revenuePastYear: Number(revenue365d._sum.amount) || 0,
      visitsCompletedPastWeek: visitsCompleted7d,
      visitsCompletedPastMonth: visitsCompleted30d,
      visitsCompletedPastYear: visitsCompleted365d,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getDashboardV2Stats error:", error)
    return { error: "Failed to fetch dashboard v2 stats" }
  }
}

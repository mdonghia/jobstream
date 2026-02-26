// =============================================================================
// Job filter tab computation -- shared utility (NOT a server action)
//
// This file contains the pure function and types for computing which filter
// tab a job belongs to. It is imported by both server actions and client
// components, so it must NOT have "use server" directive.
// =============================================================================

export type JobFilterTab =
  | "recurring"
  | "awaiting_approval"
  | "unscheduled"
  | "upcoming"
  | "needs_invoicing"
  | "awaiting_payment"
  | "closed"

export const ALL_TABS: JobFilterTab[] = [
  "recurring",
  "awaiting_approval",
  "unscheduled",
  "upcoming",
  "needs_invoicing",
  "awaiting_payment",
  "closed",
]

// Shape of the data we need to compute a job's filter tab.
// This is passed into the pure function so it can work without a database.
export type JobForTabComputation = {
  isRecurring: boolean
  visits: { status: string; schedulingType: string }[]
  quotesInContext: { status: string }[]
  quote: { status: string } | null
  invoices: { status: string; amountDue: any }[]
}

/**
 * Determine which filter tab a job belongs to based on priority order.
 *
 * Priority (highest wins):
 *   1. Recurring        -- isRecurring flag is true
 *   2. Awaiting Approval-- has a quote with status SENT
 *   3. Unscheduled      -- has non-completed/cancelled visits with UNSCHEDULED scheduling type
 *   4. Upcoming         -- has visits that are SCHEDULED, EN_ROUTE, or IN_PROGRESS
 *   5. Needs Invoicing  -- all non-cancelled visits completed, no actionable invoice
 *   6. Awaiting Payment -- has an invoice that is SENT, VIEWED, OVERDUE, or PARTIALLY_PAID
 *   7. Closed           -- everything else (fully paid or all cancelled)
 */
export function computeJobFilterTab(job: JobForTabComputation): JobFilterTab {
  // 1. Recurring always wins
  if (job.isRecurring) {
    return "recurring"
  }

  // 2. Awaiting Approval -- any associated quote with status SENT
  const hasQuoteSent =
    job.quotesInContext.some((q) => q.status === "SENT") ||
    (job.quote !== null && job.quote.status === "SENT")
  if (hasQuoteSent) {
    return "awaiting_approval"
  }

  // 3. Unscheduled -- any active visit with schedulingType UNSCHEDULED
  const hasUnscheduledVisit = job.visits.some(
    (v) =>
      v.schedulingType === "UNSCHEDULED" &&
      v.status !== "COMPLETED" &&
      v.status !== "CANCELLED"
  )
  if (hasUnscheduledVisit) {
    return "unscheduled"
  }

  // 4. Upcoming -- any visit that is SCHEDULED, EN_ROUTE, or IN_PROGRESS
  const hasActiveVisit = job.visits.some(
    (v) =>
      v.status === "SCHEDULED" ||
      v.status === "EN_ROUTE" ||
      v.status === "IN_PROGRESS"
  )
  if (hasActiveVisit) {
    return "upcoming"
  }

  // 5. Needs Invoicing -- all non-cancelled visits are COMPLETED, and
  //    no invoice exists (or all invoices are VOID).
  //    A DRAFT invoice counts as actionable -- the invoice exists, it
  //    just hasn't been sent yet, so the job should not stay in needs_invoicing.
  const nonCancelledVisits = job.visits.filter((v) => v.status !== "CANCELLED")
  const allVisitsCompleted =
    nonCancelledVisits.length > 0 &&
    nonCancelledVisits.every((v) => v.status === "COMPLETED")

  if (allVisitsCompleted) {
    const hasActionableInvoice = job.invoices.some(
      (inv) => inv.status !== "VOID"
    )
    if (!hasActionableInvoice) {
      return "needs_invoicing"
    }
  }

  // 6. Awaiting Payment -- any invoice that is SENT, VIEWED, OVERDUE, or PARTIALLY_PAID
  const awaitingPaymentStatuses = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"]
  const hasUnpaidInvoice = job.invoices.some((inv) =>
    awaitingPaymentStatuses.includes(inv.status)
  )
  if (hasUnpaidInvoice) {
    return "awaiting_payment"
  }

  // 7. Closed -- everything else (fully paid, all cancelled, etc.)
  return "closed"
}

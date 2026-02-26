// =============================================================================
// Job filter tab computation -- shared utility (NOT a server action)
//
// This file contains the pure function and types for computing which filter
// tab a job belongs to. It is imported by both server actions and client
// components, so it must NOT have "use server" directive.
// =============================================================================

export type JobFilterTab =
  | "unscheduled"
  | "scheduled"
  | "quoted"
  | "needs_invoicing"
  | "awaiting_payment"
  | "closed"

export const ALL_TABS: JobFilterTab[] = [
  "unscheduled",
  "scheduled",
  "quoted",
  "needs_invoicing",
  "awaiting_payment",
  "closed",
]

// Shape of the data we need to compute a job's filter tab.
// This is passed into the pure function so it can work without a database.
export type JobForTabComputation = {
  isRecurring: boolean
  visits: { status: string }[]
  quotesInContext: { status: string }[]
  quote: { status: string } | null
  invoices: { status: string; amountDue: any }[]
}

/**
 * Determine which filter tab a job belongs to based on priority order.
 *
 * Priority (highest wins):
 *   1. Quoted           -- has a quote with status SENT
 *   2. Unscheduled      -- has non-completed/cancelled visits with UNSCHEDULED status
 *   3. Scheduled        -- has visits that are SCHEDULED, EN_ROUTE, or IN_PROGRESS
 *   4. Needs Invoicing  -- all non-cancelled visits completed, no actionable invoice
 *   5. Awaiting Payment -- has an invoice that is SENT, VIEWED, OVERDUE, or PARTIALLY_PAID
 *   6. Closed           -- everything else (fully paid or all cancelled)
 *
 * Note: Recurring jobs (isRecurring=true) are no longer separated into their
 * own tab. They fall through to whichever status-based tab is most actionable.
 */
export function computeJobFilterTab(job: JobForTabComputation): JobFilterTab {
  // 1. Quoted -- any associated quote with status SENT
  const hasQuoteSent =
    job.quotesInContext.some((q) => q.status === "SENT") ||
    (job.quote !== null && job.quote.status === "SENT")
  if (hasQuoteSent) {
    return "quoted"
  }

  // 2. Unscheduled -- any visit with unified status UNSCHEDULED
  const hasUnscheduledVisit = job.visits.some(
    (v) => v.status === "UNSCHEDULED"
  )
  if (hasUnscheduledVisit) {
    return "unscheduled"
  }

  // 3. Scheduled -- any visit that is ANYTIME, SCHEDULED, EN_ROUTE, or IN_PROGRESS
  const hasActiveVisit = job.visits.some(
    (v) =>
      v.status === "ANYTIME" ||
      v.status === "SCHEDULED" ||
      v.status === "EN_ROUTE" ||
      v.status === "IN_PROGRESS"
  )
  if (hasActiveVisit) {
    return "scheduled"
  }

  // 4. Needs Invoicing -- all non-cancelled visits are COMPLETED, and
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

  // 5. Awaiting Payment -- any invoice that is SENT, VIEWED, OVERDUE, or PARTIALLY_PAID
  const awaitingPaymentStatuses = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"]
  const hasUnpaidInvoice = job.invoices.some((inv) =>
    awaitingPaymentStatuses.includes(inv.status)
  )
  if (hasUnpaidInvoice) {
    return "awaiting_payment"
  }

  // 6. Closed -- everything else (fully paid, all cancelled, etc.)
  return "closed"
}

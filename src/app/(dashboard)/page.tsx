import { requireAuth } from "@/lib/auth-utils"
import { getDashboardV2Stats } from "@/actions/dashboard-v2"
import { DashboardPageV2 } from "@/components/dashboard/dashboard-page-v2"

export default async function DashboardPage() {
  const user = await requireAuth()

  // If the user is a technician, render the tech pipeline
  // instead of the standard dashboard. Dynamic import keeps the bundle lean for
  // non-tech users.
  if (user.role === "TECHNICIAN") {
    const TechPipeline = (await import("@/components/tech/tech-pipeline")).default
    return <TechPipeline />
  }

  // --------------------------------------------------------------------------
  // V2 Dashboard
  // --------------------------------------------------------------------------
  const v2Result = await getDashboardV2Stats()

  const v2Stats: import("@/actions/dashboard-v2").DashboardV2Stats =
    "error" in v2Result
      ? {
          unscheduledJobsCount: 0,
          needsInvoicingCount: 0,
          overdueQuotesCount: 0,
          overdueInvoicesCount: 0,
          visitsScheduledToday: 0,
          visitsCompletedToday: 0,
          revenuePastWeek: 0,
          revenuePastMonth: 0,
          revenuePastYear: 0,
          visitsCompletedPastWeek: 0,
          visitsCompletedPastMonth: 0,
          visitsCompletedPastYear: 0,
        }
      : v2Result

  // Serialize for client component (handles Date -> string, Decimal -> number)
  const serializedV2 = JSON.parse(JSON.stringify(v2Stats))

  return <DashboardPageV2 stats={serializedV2} userName={user.firstName} />
}

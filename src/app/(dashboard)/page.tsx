import { requireAuth } from "@/lib/auth-utils"
import { featureFlags } from "@/lib/feature-flags"
import {
  getDashboardStats,
  getRevenueChart,
  getJobsByStatusChart,
  getUpcomingJobs,
  getRecentActivity,
  getTodaysSchedule,
  getActionRequired,
} from "@/actions/dashboard"
import { getDashboardV2Stats } from "@/actions/dashboard-v2"
import { DashboardPage as DashboardPageClient } from "@/components/dashboard/dashboard-page"
import { DashboardPageV2 } from "@/components/dashboard/dashboard-page-v2"

export default async function DashboardPage() {
  const user = await requireAuth()

  // If v2Nav is enabled and the user is a technician, render the tech pipeline
  // instead of the standard dashboard. Dynamic import keeps the bundle lean for
  // non-tech users.
  if (featureFlags.v2Nav && user.role === "TECHNICIAN") {
    const TechPipeline = (await import("@/components/tech/tech-pipeline")).default
    return <TechPipeline />
  }

  // --------------------------------------------------------------------------
  // V2 Dashboard (feature-flagged)
  // --------------------------------------------------------------------------
  if (featureFlags.v2Dashboard) {
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

  // --------------------------------------------------------------------------
  // V1 Dashboard (original)
  // --------------------------------------------------------------------------
  const [
    statsResult,
    revenueResult,
    statusResult,
    upcomingResult,
    activityResult,
    scheduleResult,
    actionResult,
  ] = await Promise.all([
    getDashboardStats(),
    getRevenueChart(),
    getJobsByStatusChart(),
    getUpcomingJobs(),
    getRecentActivity(),
    getTodaysSchedule(),
    getActionRequired(),
  ])

  // Provide fallback values if any server action returned an error
  const stats =
    "error" in statsResult
      ? {
          revenueThisMonth: 0,
          revenueLastMonth: 0,
          revenueChange: 0,
          jobsCompletedThisMonth: 0,
          jobsCompletedLastMonth: 0,
          jobsChange: 0,
          outstandingInvoices: { count: 0, total: 0 },
          quoteConversionRate: 0,
        }
      : statsResult

  const revenueChart = "error" in revenueResult ? [] : revenueResult
  const jobsByStatus = "error" in statusResult ? [] : statusResult
  const upcomingJobs = "error" in upcomingResult ? [] : upcomingResult
  const recentActivity = "error" in activityResult ? [] : activityResult
  const todaysSchedule = "error" in scheduleResult ? [] : scheduleResult
  const actionRequired =
    "error" in actionResult
      ? { overdueInvoices: [], pendingQuotes: [], pendingBookings: [] }
      : actionResult

  // Serialize for client component (handles Date -> string, Decimal -> number)
  const serializedData = JSON.parse(
    JSON.stringify({
      stats,
      revenueChart,
      jobsByStatus,
      upcomingJobs,
      recentActivity,
      todaysSchedule,
      actionRequired,
    })
  )

  return (
    <DashboardPageClient
      stats={serializedData.stats}
      revenueChart={serializedData.revenueChart}
      jobsByStatus={serializedData.jobsByStatus}
      upcomingJobs={serializedData.upcomingJobs}
      recentActivity={serializedData.recentActivity}
      todaysSchedule={serializedData.todaysSchedule}
      actionRequired={serializedData.actionRequired}
      userName={user.firstName}
    />
  )
}

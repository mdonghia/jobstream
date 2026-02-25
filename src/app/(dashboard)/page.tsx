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
import { DashboardPage as DashboardPageClient } from "@/components/dashboard/dashboard-page"

export default async function DashboardPage() {
  const user = await requireAuth()

  // If v2Nav is enabled and the user is a technician, render the tech pipeline
  // instead of the standard dashboard. Dynamic import keeps the bundle lean for
  // non-tech users.
  if (featureFlags.v2Nav && user.role === "TECHNICIAN") {
    const TechPipeline = (await import("@/components/tech/tech-pipeline")).default
    return <TechPipeline />
  }

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

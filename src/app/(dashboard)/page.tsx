import { requireAuth } from "@/lib/auth-utils"
import {
  getDashboardStats,
  getRevenueChart,
  getJobsByStatusChart,
  getUpcomingJobs,
  getRecentActivity,
} from "@/actions/dashboard"
import { DashboardPage as DashboardPageClient } from "@/components/dashboard/dashboard-page"

export default async function DashboardPage() {
  const user = await requireAuth()

  const [statsResult, revenueResult, statusResult, upcomingResult, activityResult] =
    await Promise.all([
      getDashboardStats(),
      getRevenueChart(),
      getJobsByStatusChart(),
      getUpcomingJobs(),
      getRecentActivity(),
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

  // Serialize for client component (handles Date -> string, Decimal -> number)
  const serializedData = JSON.parse(
    JSON.stringify({
      stats,
      revenueChart,
      jobsByStatus,
      upcomingJobs,
      recentActivity,
    })
  )

  return (
    <DashboardPageClient
      stats={serializedData.stats}
      revenueChart={serializedData.revenueChart}
      jobsByStatus={serializedData.jobsByStatus}
      upcomingJobs={serializedData.upcomingJobs}
      recentActivity={serializedData.recentActivity}
      userName={user.firstName}
    />
  )
}

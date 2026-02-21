import { requireAuth } from "@/lib/auth-utils"
import { getCalendarJobs, getUnscheduledJobs } from "@/actions/jobs"
import { getTeamMembers } from "@/actions/settings"
import { ScheduleLayout } from "@/components/calendar/schedule-layout"
import { startOfWeek, endOfWeek } from "date-fns"

export default async function SchedulePage() {
  await requireAuth()

  // Calculate the current week range for initial data fetch
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

  // Fetch all initial data in parallel
  const [calendarResult, unscheduledResult, teamResult] = await Promise.all([
    getCalendarJobs({
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
    }),
    getUnscheduledJobs(),
    getTeamMembers(),
  ])

  // Serialize Prisma Decimals/Dates for client components
  const initialJobs =
    "error" in calendarResult
      ? []
      : JSON.parse(JSON.stringify(calendarResult.jobs))

  const unscheduledJobs =
    "error" in unscheduledResult
      ? []
      : JSON.parse(JSON.stringify(unscheduledResult.jobs))

  const teamMembers =
    "error" in teamResult
      ? []
      : JSON.parse(JSON.stringify(teamResult.members))

  return (
    <ScheduleLayout
      initialJobs={initialJobs}
      teamMembers={teamMembers}
      unscheduledJobs={unscheduledJobs}
    />
  )
}

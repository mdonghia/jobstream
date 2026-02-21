import { requireAuth } from "@/lib/auth-utils"
import { getCalendarJobs, getUnscheduledJobs } from "@/actions/jobs"
import { getTeamMembers } from "@/actions/settings"
import { CalendarView } from "@/components/calendar/calendar-view"
import { UnscheduledSidebar } from "@/components/calendar/unscheduled-sidebar"
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
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0 p-6 overflow-hidden flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-[#0A2540]">Schedule</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Manage your team&apos;s schedule and job assignments.
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <CalendarView initialJobs={initialJobs} teamMembers={teamMembers} />
        </div>
      </div>

      {/* Unscheduled sidebar */}
      <UnscheduledSidebar jobs={unscheduledJobs} />
    </div>
  )
}

import { requireAuth } from "@/lib/auth-utils"
import { getCalendarJobs, getUnscheduledJobs } from "@/actions/jobs"
import { getCalendarVisits, getUnscheduledVisits } from "@/actions/visits"
import { getTeamMembers } from "@/actions/settings"
import { ScheduleLayout } from "@/components/calendar/schedule-layout"
import { CalendarViewV2 } from "@/components/calendar/calendar-view-v2"
import { featureFlags } from "@/lib/feature-flags"
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"

export default async function SchedulePage() {
  await requireAuth()

  const now = new Date()

  // ── V2: Visit-based calendar ──────────────────────────────────────────────
  if (featureFlags.v2Visits) {
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    const [scheduledResult, unscheduledResult, teamResult] = await Promise.all([
      getCalendarVisits({
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
      }),
      getUnscheduledVisits(),
      getTeamMembers(),
    ])

    const allVisits =
      "error" in scheduledResult
        ? []
        : JSON.parse(JSON.stringify(scheduledResult.visits))

    // Separate SCHEDULED visits from ANYTIME visits
    const initialVisits = allVisits.filter(
      (v: { schedulingType: string }) => v.schedulingType === "SCHEDULED"
    )
    const anytimeVisits = allVisits.filter(
      (v: { schedulingType: string }) => v.schedulingType === "ANYTIME"
    )

    const unscheduledVisits =
      "error" in unscheduledResult
        ? []
        : JSON.parse(JSON.stringify(unscheduledResult.visits))

    const teamMembers =
      "error" in teamResult
        ? []
        : JSON.parse(JSON.stringify(teamResult.members))

    return (
      <div className="flex h-[calc(100vh-64px)]">
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2540]">
                Schedule
              </h1>
              <p className="text-sm text-[#8898AA] mt-0.5">
                Dispatch board -- manage visits and crew assignments.
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CalendarViewV2
              initialVisits={initialVisits}
              unscheduledVisits={unscheduledVisits}
              anytimeVisits={anytimeVisits}
              teamMembers={teamMembers}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── V1: Job-based calendar (existing) ─────────────────────────────────────
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

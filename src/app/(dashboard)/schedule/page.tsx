import { requireAuth } from "@/lib/auth-utils"
import { getCalendarVisits, getUnscheduledVisits } from "@/actions/visits"
import { getTeamMembers } from "@/actions/settings"
import { CalendarViewV2 } from "@/components/calendar/calendar-view-v2"
import { startOfDay, endOfDay } from "date-fns"

export default async function SchedulePage() {
  await requireAuth()

  const now = new Date()
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

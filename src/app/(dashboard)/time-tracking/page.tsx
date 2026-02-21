import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { TimeTrackingPage } from "@/components/time-tracking/time-tracking-page"

export default async function TimeTrackingRoute() {
  await requireAuth()

  // Try to load initial data from server actions (when available)
  let initialEntries: any[] = []
  let initialJobs: any[] = []
  let initialTeamMembers: any[] = []

  try {
    const mod = await import("@/actions/time-entries").catch(() => null)
    if (mod?.getTimeEntries) {
      const today = new Date()
      const dateFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const dateTo = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()
      const result = await mod.getTimeEntries({ dateFrom, dateTo })
      if (result && !("error" in result)) {
        initialEntries = (result.entries ?? []).map((e: any) => ({
          ...e,
          userName: e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown",
          jobTitle: e.job?.title ?? null,
          clockIn: e.clockIn instanceof Date ? e.clockIn.toISOString() : e.clockIn,
          clockOut: e.clockOut instanceof Date ? e.clockOut.toISOString() : e.clockOut,
        }))
      }
    }
    // Load jobs from the jobs action module
    const jobsMod = await import("@/actions/jobs").catch(() => null)
    if (jobsMod?.getJobs) {
      const jobsResult = await jobsMod.getJobs({ status: "SCHEDULED", perPage: 100 })
      if (jobsResult && !("error" in jobsResult)) {
        initialJobs = (jobsResult.jobs ?? []).map((j: any) => ({
          id: j.id,
          title: j.title,
        }))
      }
    }
    // Load team members from settings
    const settingsMod = await import("@/actions/settings").catch(() => null)
    if (settingsMod?.getTeamMembers) {
      const result = await settingsMod.getTeamMembers()
      if (result && !("error" in result) && result.members) {
        initialTeamMembers = result.members.map((m: any) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
        }))
      }
    }
  } catch {
    // Server actions not yet available -- render with empty data
  }

  return (
    <Suspense>
      <TimeTrackingPage
        initialEntries={initialEntries}
        initialJobs={initialJobs}
        initialTeamMembers={initialTeamMembers}
      />
    </Suspense>
  )
}

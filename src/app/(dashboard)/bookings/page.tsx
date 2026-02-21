import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { BookingPage } from "@/components/bookings/booking-page"

export default async function BookingsRoute() {
  await requireAuth()

  // Try to load initial data from server actions (when available)
  let initialBookings: any[] = []
  let initialTeamMembers: any[] = []

  try {
    const mod = await import("@/actions/bookings").catch(() => null)
    if (mod?.getBookings) {
      const result = await mod.getBookings({})
      if (result && !("error" in result)) {
        initialBookings = (result.bookings ?? []).map((b: any) => ({
          ...b,
          serviceName: b.service?.name ?? null,
          createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
          preferredDate: b.preferredDate instanceof Date ? b.preferredDate.toISOString() : b.preferredDate,
        }))
      }
    }
    // Team members come from the settings/team actions
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
      <BookingPage
        initialBookings={initialBookings}
        initialTeamMembers={initialTeamMembers}
      />
    </Suspense>
  )
}

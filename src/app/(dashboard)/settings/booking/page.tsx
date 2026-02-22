import { requireAuth } from "@/lib/auth-utils"
import { getBookingSettings } from "@/actions/settings"
import { BookingSettingsForm } from "@/components/settings/booking-settings-form"

export default async function SettingsBookingPage() {
  await requireAuth()
  const result = await getBookingSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Booking Widget
        </h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  return (
    <BookingSettingsForm
      settings={result.settings}
      services={result.services}
    />
  )
}

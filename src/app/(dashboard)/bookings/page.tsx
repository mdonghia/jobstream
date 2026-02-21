import { requireAuth } from "@/lib/auth-utils"
import { CalendarPlus } from "lucide-react"

export default async function BookingsPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Bookings</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <CalendarPlus className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No booking requests
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Set up your online booking widget to receive requests.
        </p>
      </div>
    </div>
  )
}

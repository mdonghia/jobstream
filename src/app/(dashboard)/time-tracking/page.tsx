import { requireAuth } from "@/lib/auth-utils"
import { Clock } from "lucide-react"

export default async function TimeTrackingPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Time Tracking</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <Clock className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No time entries yet
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Start tracking time on your jobs.
        </p>
      </div>
    </div>
  )
}

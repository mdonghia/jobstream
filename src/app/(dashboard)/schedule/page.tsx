import { requireAuth } from "@/lib/auth-utils"
import { Calendar } from "lucide-react"

export default async function SchedulePage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Schedule</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <Calendar className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No jobs scheduled
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Create a job and schedule it to see it here.
        </p>
      </div>
    </div>
  )
}

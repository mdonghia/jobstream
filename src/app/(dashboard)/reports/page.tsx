import { requireAuth } from "@/lib/auth-utils"
import { BarChart3 } from "lucide-react"

export default async function ReportsPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Reports</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <BarChart3 className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          Reports coming soon
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Analytics and reporting will be available here.
        </p>
      </div>
    </div>
  )
}

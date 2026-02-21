import { requireAuth } from "@/lib/auth-utils"
import { LayoutDashboard } from "lucide-react"

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A2540]">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-[#425466] mt-1">
          Here&apos;s an overview of your business.
        </p>
      </div>

      {/* Placeholder for dashboard cards and charts */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <LayoutDashboard className="w-16 h-16 text-[#8898AA] mb-4" />
        <h2 className="text-lg font-semibold text-[#0A2540] mb-2">
          Dashboard coming soon
        </h2>
        <p className="text-sm text-[#425466] max-w-md">
          Revenue charts, job summaries, and activity feeds will appear here
          once you start using JobStream.
        </p>
      </div>
    </div>
  )
}

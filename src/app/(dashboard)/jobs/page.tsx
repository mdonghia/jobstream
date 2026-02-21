import { requireAuth } from "@/lib/auth-utils"
import { Briefcase } from "lucide-react"

export default async function JobsPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Jobs</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <Briefcase className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No jobs yet
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Create your first job to start tracking work.
        </p>
        <button className="mt-6 px-4 py-2 bg-[#635BFF] text-white rounded-lg hover:bg-[#635BFF]/90 transition-colors">
          New Job
        </button>
      </div>
    </div>
  )
}

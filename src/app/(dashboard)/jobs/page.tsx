import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import JobListV2 from "@/components/jobs/job-list-v2"

export default async function JobsPage() {
  await requireAuth()

  return (
    <Suspense>
      <JobListV2 />
    </Suspense>
  )
}

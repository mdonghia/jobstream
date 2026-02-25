import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { featureFlags } from "@/lib/feature-flags"
import { getJobs } from "@/actions/jobs"
import { getTeamMembers } from "@/actions/settings"
import { JobList } from "@/components/jobs/job-list"
import JobListV2 from "@/components/jobs/job-list-v2"

export default async function JobsPage() {
  await requireAuth()

  if (featureFlags.v2Visits) {
    return <JobListV2 />
  }

  const [jobsResult, teamResult] = await Promise.all([
    getJobs({ page: 1, perPage: 25 }),
    getTeamMembers(),
  ])

  const jobs = "error" in jobsResult ? [] : jobsResult.jobs
  const total = "error" in jobsResult ? 0 : jobsResult.total
  const page = "error" in jobsResult ? 1 : jobsResult.page
  const totalPages = "error" in jobsResult ? 0 : jobsResult.totalPages
  const statusCounts = "error" in jobsResult ? {} : (jobsResult.statusCounts || {})

  const teamMembers =
    teamResult && "members" in teamResult
      ? (teamResult.members ?? []).map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          avatar: m.avatar,
          color: m.color,
        }))
      : []

  // Serialize Prisma Dates/Decimals for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <Suspense>
      <JobList
        initialJobs={serialize(jobs)}
        initialTotal={total}
        initialPage={page}
        initialTotalPages={totalPages}
        initialStatusCounts={serialize(statusCounts)}
        teamMembers={serialize(teamMembers)}
      />
    </Suspense>
  )
}

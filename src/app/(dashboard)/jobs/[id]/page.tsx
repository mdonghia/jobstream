import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getJob } from "@/actions/jobs"
import { JobDetail } from "@/components/jobs/job-detail"

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  const result = await getJob(id)
  if (!result || "error" in result) {
    notFound()
  }

  // Serialize Prisma Dates/Decimals for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <JobDetail
      job={serialize((result as any).job)}
      currentUserId={user.id}
    />
  )
}

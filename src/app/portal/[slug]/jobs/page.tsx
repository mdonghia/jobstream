import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPortalSession, getPortalJobs } from "@/actions/portal"
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils"

export default async function PortalJobsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Verify session
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(`portal_session_${slug}`)?.value

  if (!sessionToken) {
    redirect(`/portal/${slug}/login`)
  }

  const session = await getPortalSession(slug, sessionToken)
  if (!session) {
    redirect(`/portal/${slug}/login`)
  }

  const { customer, organization } = session
  const jobs = await getPortalJobs(customer.id, organization.id)

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    IN_PROGRESS: "bg-yellow-50 text-yellow-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-red-50 text-red-700",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A2540]">Your Jobs</h1>
        <p className="text-[#425466] mt-1">
          View all your scheduled and completed jobs.
        </p>
      </div>

      {jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job: Record<string, unknown>) => {
            const lineItems = (job.lineItems as Array<Record<string, unknown>>) || []
            const total = lineItems.reduce(
              (sum: number, item: Record<string, unknown>) => sum + parseFloat(item.total as string || "0"),
              0
            )

            return (
              <div
                key={job.id as string}
                className="bg-white rounded-xl border border-[#E3E8EE] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#0A2540]">
                        {job.title as string}
                      </h3>
                      <span className="text-xs text-[#8898AA]">
                        {job.jobNumber as string}
                      </span>
                    </div>
                    {job.description ? (
                      <p className="text-sm text-[#425466] mt-1">
                        {String(job.description)}
                      </p>
                    ) : null}
                    <p className="text-sm text-[#8898AA] mt-2">
                      {formatDateTime(job.scheduledStart as string)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        statusColors[(job.status as string)] || "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {(job.status as string).replace("_", " ")}
                    </span>
                    {total > 0 && (
                      <span className="text-sm font-medium text-[#0A2540]">
                        {formatCurrency(total)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center">
          <p className="text-[#8898AA]">No jobs found.</p>
        </div>
      )}
    </div>
  )
}

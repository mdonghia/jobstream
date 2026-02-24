import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getPortalSession, getPortalDashboard } from "@/actions/portal"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { PortalMessageForm } from "@/components/portal/portal-message-form"

export default async function PortalDashboardPage({
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
  const dashboard = await getPortalDashboard(customer.id, organization.id)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A2540]">
          Welcome, {customer.firstName}!
        </h1>
        <p className="text-[#425466] mt-1">
          Here is an overview of your account with {organization.name}.
        </p>
      </div>

      {/* Action Needed Section */}
      {(dashboard.unpaidInvoices?.length > 0 || dashboard.pendingQuotes?.length > 0) && (
        <div className="bg-white rounded-xl border border-[#E3E8EE] p-6">
          <h2 className="text-lg font-semibold text-[#0A2540] mb-4">
            Action Needed
          </h2>

          {/* Unpaid Invoices */}
          {dashboard.unpaidInvoices?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-[#425466] mb-2">
                Unpaid Invoices
              </h3>
              <div className="space-y-2">
                {dashboard.unpaidInvoices.map((invoice: Record<string, unknown>) => (
                  <div
                    key={invoice.id as string}
                    className="flex items-center justify-between p-3 bg-[#F6F8FA] rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-[#0A2540]">
                        {invoice.invoiceNumber as string}
                      </span>
                      <span className="text-sm text-[#8898AA] ml-2">
                        Due {formatDate(invoice.dueDate as string)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#0A2540]">
                        {formatCurrency(invoice.amountDue as string)}
                      </span>
                      <Link
                        href={`/portal/${slug}/invoices/${invoice.accessToken}`}
                        className="text-sm font-medium text-[#635BFF] hover:underline"
                      >
                        Pay Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Quotes */}
          {dashboard.pendingQuotes?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#425466] mb-2">
                Pending Quotes
              </h3>
              <div className="space-y-2">
                {dashboard.pendingQuotes.map((quote: Record<string, unknown>) => (
                  <div
                    key={quote.id as string}
                    className="flex items-center justify-between p-3 bg-[#F6F8FA] rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-[#0A2540]">
                        {quote.quoteNumber as string}
                      </span>
                      <span className="text-sm text-[#8898AA] ml-2">
                        {formatCurrency(quote.total as string)}
                      </span>
                    </div>
                    <Link
                      href={`/portal/${slug}/quotes/${quote.accessToken}`}
                      className="text-sm font-medium text-[#635BFF] hover:underline"
                    >
                      View Quote
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-6">
        <h2 className="text-lg font-semibold text-[#0A2540] mb-4">
          Upcoming Appointments
        </h2>
        {dashboard.upcomingJobs?.length > 0 ? (
          <div className="space-y-3">
            {dashboard.upcomingJobs.map((job: Record<string, unknown>) => (
              <div
                key={job.id as string}
                className="flex items-center justify-between p-3 bg-[#F6F8FA] rounded-lg"
              >
                <div>
                  <p className="font-medium text-[#0A2540]">{job.title as string}</p>
                  <p className="text-sm text-[#8898AA]">
                    {formatDateTime(job.scheduledStart as string)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    job.status === "SCHEDULED"
                      ? "bg-blue-50 text-blue-700"
                      : job.status === "IN_PROGRESS"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-green-50 text-green-700"
                  }`}
                >
                  {(job.status as string).replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8898AA]">No upcoming appointments.</p>
        )}
      </div>

      {/* Send a Message */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-6">
        <h2 className="text-lg font-semibold text-[#0A2540] mb-4">
          Send a Message
        </h2>
        <p className="text-sm text-[#425466] mb-3">
          Have a question or need help? Send us a message and we will get back to you.
        </p>
        <PortalMessageForm customerId={customer.id} orgId={organization.id} />
      </div>
    </div>
  )
}

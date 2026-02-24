import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getPortalSession, getPortalInvoices } from "@/actions/portal"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function PortalInvoicesPage({
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
  const invoices = await getPortalInvoices(customer.id, organization.id)

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-50 text-gray-700",
    SENT: "bg-blue-50 text-blue-700",
    VIEWED: "bg-purple-50 text-purple-700",
    PAID: "bg-green-50 text-green-700",
    PARTIALLY_PAID: "bg-yellow-50 text-yellow-700",
    OVERDUE: "bg-red-50 text-red-700",
    VOID: "bg-gray-50 text-gray-500",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A2540]">Your Invoices</h1>
        <p className="text-[#425466] mt-1">
          View and pay your invoices.
        </p>
      </div>

      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((invoice: Record<string, unknown>) => (
            <div
              key={invoice.id as string}
              className="bg-white rounded-xl border border-[#E3E8EE] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#0A2540]">
                      {invoice.invoiceNumber as string}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        statusColors[(invoice.status as string)] || "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {(invoice.status as string).replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-[#8898AA] mt-1">
                    Due {formatDate(invoice.dueDate as string)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold text-[#0A2540]">
                    {formatCurrency(invoice.total as string)}
                  </span>
                  {parseFloat(invoice.amountDue as string) > 0 && (
                    <span className="text-sm text-[#8898AA]">
                      Due: {formatCurrency(invoice.amountDue as string)}
                    </span>
                  )}
                  <Link
                    href={`/portal/${slug}/invoices/${invoice.accessToken}`}
                    className="text-sm font-medium text-[#635BFF] hover:underline"
                  >
                    {["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status as string)
                      ? "Pay Now"
                      : "View"}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center">
          <p className="text-[#8898AA]">No invoices found.</p>
        </div>
      )}
    </div>
  )
}

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getPortalSession, getPortalQuotes } from "@/actions/portal"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function PortalQuotesPage({
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
  const quotes = await getPortalQuotes(customer.id, organization.id)

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-50 text-gray-700",
    SENT: "bg-blue-50 text-blue-700",
    APPROVED: "bg-green-50 text-green-700",
    DECLINED: "bg-red-50 text-red-700",
    INVOICED: "bg-purple-50 text-purple-700",
    EXPIRED: "bg-gray-50 text-gray-500",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A2540]">Your Quotes</h1>
        <p className="text-[#425466] mt-1">
          View and respond to quotes.
        </p>
      </div>

      {quotes.length > 0 ? (
        <div className="space-y-3">
          {quotes.map((quote: Record<string, unknown>) => (
            <div
              key={quote.id as string}
              className="bg-white rounded-xl border border-[#E3E8EE] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#0A2540]">
                      {quote.quoteNumber as string}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        statusColors[(quote.status as string)] || "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {quote.status as string}
                    </span>
                  </div>
                  <p className="text-sm text-[#8898AA] mt-1">
                    Valid until {formatDate(quote.validUntil as string)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold text-[#0A2540]">
                    {formatCurrency(quote.total as string)}
                  </span>
                  <Link
                    href={`/portal/${slug}/quotes/${quote.accessToken}`}
                    className="text-sm font-medium text-[#635BFF] hover:underline"
                  >
                    View Quote
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center">
          <p className="text-[#8898AA]">No quotes found.</p>
        </div>
      )}
    </div>
  )
}

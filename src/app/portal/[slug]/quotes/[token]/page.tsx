import { getQuoteByToken } from "@/actions/quotes"
import { QuotePortalView } from "@/components/portal/quote-portal-view"

export default async function PortalQuotePage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { token } = await params
  const result = await getQuoteByToken(token)

  if ("error" in result) {
    return (
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0A2540]">
          Quote Not Found
        </h2>
        <p className="mt-2 text-sm text-[#425466]">
          This quote link is invalid or has expired.
        </p>
      </div>
    )
  }

  const quote = JSON.parse(JSON.stringify(result.quote))

  return <QuotePortalView quote={quote} />
}

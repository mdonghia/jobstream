import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getQuote } from "@/actions/quotes"
import { QuoteDetail } from "@/components/quotes/quote-detail"

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const { id } = await params

  const result = await getQuote(id)

  if (!result || "error" in result) {
    notFound()
  }

  const quote = (result as any).quote

  // Build a timeline from the quote data
  const timeline: {
    id: string
    action: string
    description: string
    timestamp: string | Date
    user?: string
  }[] = []

  if (quote.createdAt) {
    timeline.push({
      id: "created",
      action: "created",
      description: "Quote created",
      timestamp: quote.createdAt,
    })
  }

  if (quote.sentAt) {
    timeline.push({
      id: "sent",
      action: "sent",
      description: "Quote sent to customer",
      timestamp: quote.sentAt,
    })
  }

  if (quote.approvedAt) {
    timeline.push({
      id: "approved",
      action: "approved",
      description: "Quote approved by customer",
      timestamp: quote.approvedAt,
    })
  }

  if (quote.declinedAt) {
    timeline.push({
      id: "declined",
      action: "declined",
      description: quote.declineReason
        ? `Quote declined: ${quote.declineReason}`
        : "Quote declined by customer",
      timestamp: quote.declinedAt,
    })
  }

  if (quote.convertedToJobId) {
    timeline.push({
      id: "converted",
      action: "converted",
      description: "Quote converted to job",
      timestamp: quote.approvedAt || quote.createdAt,
    })
  }

  // Sort timeline chronologically
  timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Serialize for client component using JSON round-trip to handle Dates and Decimals
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <QuoteDetail
      quote={serialize(quote)}
      timeline={serialize(timeline)}
    />
  )
}

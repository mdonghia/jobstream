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

  // Build a timeline from the quote's timestamps
  const quote = result.quote
  const timeline: {
    id: string
    action: string
    description: string
    timestamp: string | Date
  }[] = []

  timeline.push({
    id: "created",
    action: "Created",
    description: "Quote was created",
    timestamp: quote.createdAt,
  })

  if (quote.sentAt) {
    timeline.push({
      id: "sent",
      action: "Sent",
      description: "Quote was sent to customer",
      timestamp: quote.sentAt,
    })
  }

  if (quote.approvedAt) {
    timeline.push({
      id: "approved",
      action: "Approved",
      description: "Customer approved the quote",
      timestamp: quote.approvedAt,
    })
  }

  if (quote.declinedAt) {
    timeline.push({
      id: "declined",
      action: "Declined",
      description: quote.declineReason
        ? `Customer declined: ${quote.declineReason}`
        : "Customer declined the quote",
      timestamp: quote.declinedAt,
    })
  }

  if (quote.convertedToJobId) {
    timeline.push({
      id: "converted",
      action: "Converted",
      description: `Converted to Job${quote.convertedJobNumber ? ` #${quote.convertedJobNumber}` : ""}`,
      timestamp: quote.approvedAt || quote.createdAt,
    })
  }

  // Serialize Prisma Decimals/Dates for client component
  const serialized = JSON.parse(JSON.stringify({ quote, timeline }))

  return <QuoteDetail quote={serialized.quote} timeline={serialized.timeline} />
}

import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getQuotes } from "@/actions/quotes"
import { QuoteList } from "@/components/quotes/quote-list"

export default async function QuotesPage() {
  await requireAuth()

  const result = await getQuotes({ page: 1, perPage: 25 })

  if ("error" in result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-red-500">Failed to load quotes. Please try again.</p>
      </div>
    )
  }

  const serialized = JSON.parse(JSON.stringify(result))

  return (
    <Suspense>
      <QuoteList
        initialQuotes={serialized.quotes}
        initialStatusCounts={serialized.statusCounts}
        initialTotal={serialized.total}
        initialPage={serialized.page}
        initialTotalPages={serialized.totalPages}
      />
    </Suspense>
  )
}

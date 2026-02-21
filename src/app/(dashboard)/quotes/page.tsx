import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getQuotes } from "@/actions/quotes"
import { QuoteList } from "@/components/quotes/quote-list"

export default async function QuotesPage() {
  await requireAuth()

  const result = await getQuotes({ page: 1, perPage: 25 })

  const quotes = "error" in result ? [] : result.quotes
  const total = "error" in result ? 0 : result.total
  const page = "error" in result ? 1 : result.page
  const totalPages = "error" in result ? 0 : result.totalPages
  const statusCounts = "error" in result ? {} : result.statusCounts

  // Serialize Prisma Decimals/Dates for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <Suspense>
      <QuoteList
        initialQuotes={serialize(quotes)}
        initialStatusCounts={serialize(statusCounts)}
        initialTotal={total}
        initialPage={page}
        initialTotalPages={totalPages}
      />
    </Suspense>
  )
}

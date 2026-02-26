import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getInvoicesV2 } from "@/actions/invoices"
import { InvoiceListV2 } from "@/components/invoices/invoice-list-v2"

const VALID_TABS = ["draft", "sent", "overdue", "partially_paid", "paid", "cancelled"] as const
type InvoiceTab = (typeof VALID_TABS)[number]

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await requireAuth()

  // Read the ?tab= query parameter and validate it
  const params = await searchParams
  const requestedTab = params.tab as InvoiceTab | undefined
  const tab: InvoiceTab =
    requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : "draft"

  const result = await getInvoicesV2({ tab, page: 1, perPage: 25 })

  if ("error" in result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-red-500">Failed to load invoices. Please try again.</p>
      </div>
    )
  }

  const serialized = JSON.parse(JSON.stringify(result))

  return (
    <Suspense>
      <InvoiceListV2
        initialInvoices={serialized.invoices}
        initialTabCounts={serialized.tabCounts}
        initialTotal={serialized.total}
        initialPage={serialized.page}
        initialTotalPages={serialized.totalPages}
        initialTab={tab}
      />
    </Suspense>
  )
}

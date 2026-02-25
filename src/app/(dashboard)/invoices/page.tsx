import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getInvoices, getInvoicesV2 } from "@/actions/invoices"
import { InvoiceList } from "@/components/invoices/invoice-list"
import { InvoiceListV2 } from "@/components/invoices/invoice-list-v2"
import { featureFlags } from "@/lib/feature-flags"

export default async function InvoicesPage() {
  await requireAuth()

  // V2: Use tabbed invoice list with 6 filter tabs
  if (featureFlags.v2Visits) {
    const result = await getInvoicesV2({ tab: "draft", page: 1, perPage: 25 })

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
          initialTab="draft"
        />
      </Suspense>
    )
  }

  // V1: Original invoice list
  const result = await getInvoices({ page: 1, perPage: 25 })

  if ("error" in result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-red-500">Failed to load invoices. Please try again.</p>
      </div>
    )
  }

  // Serialize Prisma Decimals/Dates for client component
  const serialized = JSON.parse(JSON.stringify(result))

  return (
    <Suspense>
      <InvoiceList
        initialInvoices={serialized.invoices}
        initialSummary={serialized.summary}
        initialStatusCounts={serialized.statusCounts}
        initialTotal={serialized.total}
        initialPage={serialized.page}
        initialTotalPages={serialized.totalPages}
      />
    </Suspense>
  )
}

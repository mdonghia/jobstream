import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getInvoices } from "@/actions/invoices"
import { InvoiceList } from "@/components/invoices/invoice-list"

export default async function InvoicesPage() {
  await requireAuth()

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

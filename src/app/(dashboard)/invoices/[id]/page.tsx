import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getInvoice } from "@/actions/invoices"
import { InvoiceDetail } from "@/components/invoices/invoice-detail"

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth()
  const { id } = await params

  const result = await getInvoice(id)

  if (!result || "error" in result) {
    notFound()
  }

  // Serialize Prisma Decimals/Dates for client component
  const invoice = JSON.parse(JSON.stringify(result.invoice))

  return <InvoiceDetail invoice={invoice} />
}

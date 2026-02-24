import { getInvoiceByToken, verifyStripePayment } from "@/actions/invoices"
import { InvoicePortalView } from "@/components/portal/invoice-portal-view"

export default async function PortalInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>
  searchParams: Promise<{ paid?: string; session_id?: string }>
}) {
  const { token } = await params
  const query = await searchParams

  // If returning from Stripe checkout, verify and record the payment first
  if (query.paid === "true" && query.session_id) {
    await verifyStripePayment(token, query.session_id)
  }

  // Fetch invoice (will now reflect updated payment status)
  const result = await getInvoiceByToken(token)

  if ("error" in result) {
    return (
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0A2540]">
          Invoice Not Found
        </h2>
        <p className="mt-2 text-sm text-[#425466]">
          This invoice link is invalid or has expired.
        </p>
      </div>
    )
  }

  const invoice = JSON.parse(JSON.stringify(result.invoice))
  const justPaid = query.paid === "true"

  return <InvoicePortalView invoice={invoice} justPaid={justPaid} />
}

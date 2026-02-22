import { requireAuth } from "@/lib/auth-utils"
import { getQuote } from "@/actions/quotes"
import { getServices, getOrganizationSettings } from "@/actions/settings"
import { getCustomers } from "@/actions/customers"
import { QuoteBuilder } from "@/components/quotes/quote-builder"
import { notFound, redirect } from "next/navigation"

interface EditQuotePageProps {
  params: Promise<{ id: string }>
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  await requireAuth()
  const { id } = await params

  const [quoteResult, servicesResult, customersResult, orgResult] =
    await Promise.all([
      getQuote(id),
      getServices(),
      getCustomers({ status: "active", perPage: 50, sortBy: "firstName", sortOrder: "asc" }),
      getOrganizationSettings(),
    ])

  if (!quoteResult || "error" in quoteResult || !quoteResult.quote) {
    notFound()
  }

  const quote = quoteResult.quote

  // Only DRAFT quotes can be edited
  if (quote.status !== "DRAFT") {
    redirect(`/quotes/${id}`)
  }

  const services =
    servicesResult && "services" in servicesResult
      ? servicesResult.services
      : []

  const customers =
    customersResult && !("error" in customersResult)
      ? customersResult.customers
      : []

  const org =
    orgResult && "organization" in orgResult ? orgResult.organization : null

  const orgSettings = {
    taxRate: org?.taxRate ? Number(org.taxRate) : 0,
    currency: org?.currency || "USD",
    quoteValidDays: org?.quoteValidDays || 30,
  }

  // Calculate valid days from validUntil
  const validDays = Math.max(
    1,
    Math.round(
      (new Date(quote.validUntil).getTime() - new Date(quote.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )

  const initialData = {
    id: quote.id,
    customerId: quote.customer.id,
    propertyId: quote.property?.id || "",
    lineItems: quote.lineItems.map((li: any) => ({
      key: `li-${li.id}`,
      serviceId: li.serviceId || undefined,
      name: li.name,
      description: li.description || "",
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      taxable: li.taxable,
    })),
    customerMessage: quote.customerMessage || "",
    internalNote: quote.internalNote || "",
    validDays,
  }

  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <QuoteBuilder
      services={serialize(services)}
      customers={serialize(customers)}
      orgSettings={serialize(orgSettings)}
      initialData={serialize(initialData)}
      mode="edit"
    />
  )
}

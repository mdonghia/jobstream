import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getQuote } from "@/actions/quotes"
import { getServices } from "@/actions/settings"
import { prisma } from "@/lib/db"
import { QuoteBuilder } from "@/components/quotes/quote-builder"

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  // Fetch quote, services, customers, and org settings in parallel
  const [quoteResult, servicesResult, customers, org] = await Promise.all([
    getQuote(id),
    getServices(),
    prisma.customer.findMany({
      where: { organizationId: user.organizationId, isArchived: false },
      take: 500,
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        properties: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            state: true,
            zip: true,
          },
          orderBy: { isPrimary: "desc" },
        },
      },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { taxRate: true, quoteValidDays: true },
    }),
  ])

  if (!quoteResult || "error" in quoteResult) {
    notFound()
  }

  const quote = quoteResult.quote

  // Only draft quotes can be edited
  if (quote.status !== "DRAFT") {
    notFound()
  }

  const services =
    servicesResult && "services" in servicesResult
      ? (servicesResult.services ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          defaultPrice: Number(s.defaultPrice),
          unit: s.unit || "each",
          taxable: s.taxable,
          isActive: s.isActive,
        }))
      : []

  const orgSettings = {
    taxRate: Number(org?.taxRate || 0),
    quoteValidDays: org?.quoteValidDays || 30,
  }

  // Calculate validDays from the quote's validUntil date
  const validUntil = new Date(quote.validUntil)
  const now = new Date()
  const diffMs = validUntil.getTime() - now.getTime()
  const validDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  const initialData = {
    id: quote.id,
    customerId: quote.customer.id,
    propertyId: quote.property?.id || undefined,
    lineItems: quote.lineItems.map((li: any) => ({
      key: `li-edit-${li.id}`,
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

  // Serialize Prisma Decimals/Dates for client component
  const serialized = JSON.parse(
    JSON.stringify({
      services,
      customers,
      orgSettings,
      initialData,
    })
  )

  return (
    <QuoteBuilder
      services={serialized.services}
      customers={serialized.customers}
      orgSettings={serialized.orgSettings}
      initialData={serialized.initialData}
      mode="edit"
    />
  )
}

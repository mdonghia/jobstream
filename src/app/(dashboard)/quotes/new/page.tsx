import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getOrganizationSettings, getServices } from "@/actions/settings"
import { getCustomers } from "@/actions/customers"
import { QuoteBuilder } from "@/components/quotes/quote-builder"
import { prisma } from "@/lib/db"

export default async function NewQuotePage() {
  const user = await requireAuth()

  const [servicesResult, customersResult, orgResult] = await Promise.all([
    getServices(),
    getCustomers({ status: "active", perPage: 50, sortBy: "firstName", sortOrder: "asc" }),
    getOrganizationSettings(),
  ])

  const services =
    servicesResult && !("error" in servicesResult)
      ? servicesResult.services
      : []

  const customers =
    customersResult && !("error" in customersResult)
      ? customersResult.customers
      : []

  const org =
    orgResult && !("error" in orgResult) ? orgResult.organization : null

  // Fetch customer properties for combobox display
  const customerIds = customers.map((c: any) => c.id)
  const properties = await prisma.property.findMany({
    where: { customerId: { in: customerIds } },
    select: {
      id: true,
      customerId: true,
      addressLine1: true,
      city: true,
      state: true,
      zip: true,
    },
  })

  // Attach properties to each customer
  const customersWithProperties = customers.map((c: any) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    properties: properties.filter((p) => p.customerId === c.id),
  }))

  const orgSettings = {
    taxRate: org ? Number(org.taxRate) : 0,
    quoteValidDays: org?.quoteValidDays ?? 30,
  }

  // Serialize for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <Suspense>
      <QuoteBuilder
        services={serialize(
          services.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            defaultPrice: Number(s.defaultPrice),
            unit: s.unit,
            taxable: s.taxable,
            isActive: s.isActive,
          }))
        )}
        customers={serialize(customersWithProperties)}
        orgSettings={serialize(orgSettings)}
      />
    </Suspense>
  )
}

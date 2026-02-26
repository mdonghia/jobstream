import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getCustomer } from "@/actions/customers"
import { getCommunications } from "@/actions/communications"
import { getCustomerActivityFeed } from "@/actions/activity"
import { prisma } from "@/lib/db"

import { CustomerDetail } from "@/components/customers/customer-detail"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  const result = await getCustomer(id)
  if (!result || "error" in result) {
    notFound()
  }

  const cust = (result as any).customer

  const [commsResult, quotes, jobs, invoices, activityResult] = await Promise.all([
    getCommunications({ customerId: id, perPage: 100 }),
    prisma.quote.findMany({
      where: { customerId: id, organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        total: true,
        status: true,
        createdAt: true,
        validUntil: true,
      },
    }),
    prisma.job.findMany({
      where: { customerId: id, organizationId: user.organizationId },
      orderBy: { scheduledStart: "desc" },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        status: true,
        scheduledStart: true,
      },
    }),
    prisma.invoice.findMany({
      where: { customerId: id, organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        createdAt: true,
        dueDate: true,
      },
    }),
    getCustomerActivityFeed(id, { limit: 50 }),
  ])

  const communications = commsResult && "communications" in commsResult ? commsResult.communications : []
  const activityEvents = activityResult && "events" in activityResult ? activityResult.events : []

  // Serialize for client component using JSON round-trip to handle Dates and Decimals
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value
  ))

  return (
    <CustomerDetail
      customer={serialize({
        id: cust.id,
        firstName: cust.firstName,
        lastName: cust.lastName,
        email: cust.email,
        phone: cust.phone,
        company: cust.company,
        source: cust.source,
        tags: cust.tags,
        notes: cust.notes,
        isArchived: cust.isArchived,
        createdAt: cust.createdAt,
        properties: cust.properties,
      })}
      customerNotes={[]}
      communications={serialize(communications)}
      stats={{ totalRevenue: 0, totalJobs: 0, totalQuotes: 0, openInvoicesCount: 0, openInvoicesAmount: 0 }}
      quotes={serialize(quotes)}
      jobs={serialize(jobs)}
      invoices={serialize(invoices)}
      payments={[]}
      recentActivityEvents={serialize(activityEvents)}
    />
  )
}

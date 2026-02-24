import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getCustomer, getCustomerNotes, getCustomerStats } from "@/actions/customers"
import { getCommunications } from "@/actions/communications"
import { getCustomerSubscriptions } from "@/actions/service-plans"
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

  const [notesResult, statsResult, commsResult, quotes, jobs, invoices, payments, subsResult, activePlans] = await Promise.all([
    getCustomerNotes(id),
    getCustomerStats(id),
    getCommunications({ customerId: id, perPage: 50 }),
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
    prisma.payment.findMany({
      where: {
        organizationId: user.organizationId,
        invoice: { customerId: id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          select: { invoiceNumber: true },
        },
      },
    }),
    getCustomerSubscriptions(id),
    prisma.servicePlan.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        visitFrequency: true,
        pricePerVisit: true,
        description: true,
        isActive: true,
      },
    }),
  ])

  const notes = notesResult && "notes" in notesResult ? notesResult.notes : []
  const communications = commsResult && "communications" in commsResult ? commsResult.communications : []
  const stats = statsResult && !("error" in statsResult)
    ? statsResult
    : { totalRevenue: 0, totalJobs: 0, totalQuotes: 0, openInvoicesCount: 0, openInvoicesAmount: 0 }
  const subscriptions = subsResult && "subscriptions" in subsResult ? subsResult.subscriptions : []

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
      customerNotes={serialize(notes)}
      communications={serialize(communications)}
      stats={serialize(stats)}
      quotes={serialize(quotes)}
      jobs={serialize(jobs)}
      invoices={serialize(invoices)}
      payments={serialize(payments)}
      subscriptions={serialize(subscriptions)}
      availablePlans={serialize(activePlans)}
    />
  )
}

import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getCustomer, getCustomerNotes, getCustomerStats } from "@/actions/customers"
import { getCommunications } from "@/actions/communications"
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

  const [notesResult, statsResult, commsResult, quotes, jobs, invoices, payments, portalMessages] = await Promise.all([
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
    prisma.portalMessage.findMany({
      where: { customerId: id, organizationId: user.organizationId },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const notes = notesResult && "notes" in notesResult ? notesResult.notes : []
  const communications = commsResult && "communications" in commsResult ? commsResult.communications : []
  const stats = statsResult && "stats" in statsResult
    ? statsResult.stats
    : { totalRevenue: 0, totalJobs: 0, totalQuotes: 0, openInvoicesCount: 0, openInvoicesAmount: 0 }

  // Fetch the last 5 ActivityEvent records across all of this customer's jobs
  const recentActivityEvents = await prisma.activityEvent.findMany({
    where: {
      organizationId: user.organizationId,
      job: { customerId: id },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      job: { select: { id: true, jobNumber: true, title: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  })

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
      portalMessages={serialize(portalMessages)}
      recentActivityEvents={serialize(recentActivityEvents)}
    />
  )
}

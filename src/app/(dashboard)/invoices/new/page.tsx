import { requireAuth } from "@/lib/auth-utils"
import { getServices } from "@/actions/settings"
import { getCustomers } from "@/actions/customers"
import { createInvoiceFromJob } from "@/actions/invoices"
import { prisma } from "@/lib/db"
import { InvoiceBuilder } from "@/components/invoices/invoice-builder"

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; duplicate?: string }>
}) {
  const user = await requireAuth()
  const params = await searchParams

  // Fetch services and customers in parallel
  const [servicesResult, customersResult, org] = await Promise.all([
    getServices(),
    getCustomers({ perPage: 500, status: "active" }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { taxRate: true, invoiceDueDays: true },
    }),
  ])

  const services =
    servicesResult && "services" in servicesResult
      ? (servicesResult.services ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          defaultPrice: Number(s.defaultPrice),
          description: s.description,
          taxable: s.taxable,
        }))
      : []

  const customers =
    customersResult && "customers" in customersResult
      ? (customersResult.customers ?? []).map((c: any) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          company: c.company,
        }))
      : []

  const orgSettings = {
    taxRate: Number(org?.taxRate || 0),
    invoiceDueDays: org?.invoiceDueDays || 30,
  }

  // Pre-fill from a job if ?jobId=xxx is in the URL
  let initialData: any = undefined
  if (params.jobId) {
    const prefillResult = await createInvoiceFromJob(params.jobId)
    if (prefillResult && "prefill" in prefillResult) {
      const job = await prisma.job.findFirst({
        where: { id: params.jobId, organizationId: user.organizationId },
        select: { jobNumber: true },
      })
      initialData = {
        ...prefillResult.prefill,
        jobNumber: job?.jobNumber || undefined,
      }
    }
  }

  // Serialize for client
  const serialized = JSON.parse(
    JSON.stringify({
      services,
      customers,
      orgSettings,
      initialData,
    })
  )

  return (
    <InvoiceBuilder
      services={serialized.services}
      customers={serialized.customers}
      orgSettings={serialized.orgSettings}
      initialData={serialized.initialData}
    />
  )
}

import { requireAuth } from "@/lib/auth-utils"
import { getServices } from "@/actions/settings"
import { prisma } from "@/lib/db"
import { QuoteBuilder } from "@/components/quotes/quote-builder"

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; customerId?: string }>
}) {
  const user = await requireAuth()
  const params = await searchParams

  // Fetch services, customers (with properties for address selector), and org settings
  const [servicesResult, customers, org] = await Promise.all([
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

  // Build initial data from search params
  let initialData: any = undefined
  if (params.customerId || params.jobId) {
    initialData = {
      customerId: params.customerId || undefined,
      jobId: params.jobId || undefined,
    }

    // If a jobId is provided, fetch the job to get its customer and property
    if (params.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: params.jobId, organizationId: user.organizationId },
        select: {
          customerId: true,
          propertyId: true,
          title: true,
          jobNumber: true,
        },
      })
      if (job) {
        initialData.customerId = job.customerId
        initialData.propertyId = job.propertyId || undefined
        // Pre-fill internal note with job context
        initialData.internalNote = `Quote for additional work on Job #${job.jobNumber}`
      }
    }
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
    />
  )
}

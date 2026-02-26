import { requireAuth } from "@/lib/auth-utils"
import { getServices, getOrganizationSettings, getTeamMembers } from "@/actions/settings"
import { getChecklistTemplates } from "@/actions/checklists"
import { prisma } from "@/lib/db"
import { JobBuilder } from "@/components/jobs/job-builder"

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const user = await requireAuth()
  const params = await searchParams

  const [servicesResult, customers, teamResult, orgResult, checklistResult] =
    await Promise.all([
      getServices(),
      prisma.customer.findMany({
        where: { organizationId: user.organizationId, isArchived: false },
        take: 50,
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
              isPrimary: true,
            },
            orderBy: { isPrimary: "desc" },
          },
        },
      }),
      getTeamMembers(),
      getOrganizationSettings(),
      getChecklistTemplates(),
    ])

  const services =
    servicesResult && "services" in servicesResult
      ? servicesResult.services
      : []

  const teamMembers =
    teamResult && "members" in teamResult ? teamResult.members : []

  const org =
    orgResult && "organization" in orgResult ? orgResult.organization : null

  const orgSettings = {
    taxRate: org?.taxRate ? Number(org.taxRate) : 0,
    currency: org?.currency || "USD",
  }

  const checklistTemplates =
    checklistResult && "templates" in checklistResult
      ? checklistResult.templates
      : []

  // Build initialData if customerId is provided (e.g., from customer profile)
  let initialData: any = undefined
  if (params.customerId) {
    const customer = customers.find((c) => c.id === params.customerId)
    if (customer) {
      const primaryProperty = customer.properties.find((p) => p.isPrimary)
      initialData = {
        customerId: customer.id,
        propertyId: primaryProperty?.id || customer.properties[0]?.id || undefined,
      }
    }
  }

  // Serialize Prisma Dates/Decimals for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <JobBuilder
      services={serialize(services)}
      customers={serialize(customers)}
      teamMembers={serialize(teamMembers)}
      orgSettings={serialize(orgSettings)}
      checklistTemplates={serialize(checklistTemplates)}
      initialData={initialData ? serialize(initialData) : undefined}
    />
  )
}

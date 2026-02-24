import { requireAuth } from "@/lib/auth-utils"
import { getServices, getOrganizationSettings, getTeamMembers } from "@/actions/settings"
import { getCustomers } from "@/actions/customers"
import { getChecklistTemplates } from "@/actions/checklists"
import { JobBuilder } from "@/components/jobs/job-builder"

export default async function NewJobPage() {
  await requireAuth()

  const [servicesResult, customersResult, teamResult, orgResult, checklistResult] =
    await Promise.all([
      getServices(),
      getCustomers({ status: "active", perPage: 50 }),
      getTeamMembers(),
      getOrganizationSettings(),
      getChecklistTemplates(),
    ])

  const services =
    servicesResult && "services" in servicesResult
      ? servicesResult.services
      : []

  const customers =
    customersResult && !("error" in customersResult)
      ? customersResult.customers
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

  // Serialize Prisma Dates/Decimals for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  return (
    <JobBuilder
      services={serialize(services)}
      customers={serialize(customers)}
      teamMembers={serialize(teamMembers)}
      orgSettings={serialize(orgSettings)}
      checklistTemplates={serialize(checklistTemplates)}
    />
  )
}

import { requireAuth } from "@/lib/auth-utils"
import { getJob } from "@/actions/jobs"
import { getServices, getTeamMembers } from "@/actions/settings"
import { getCustomers } from "@/actions/customers"
import { getChecklistTemplates } from "@/actions/checklists"
import { JobBuilder } from "@/components/jobs/job-builder"
import { notFound } from "next/navigation"

interface EditJobPageProps {
  params: Promise<{ id: string }>
}

export default async function EditJobPage({ params }: EditJobPageProps) {
  await requireAuth()
  const { id } = await params

  const [jobResult, servicesResult, teamResult, customersResult, checklistResult] =
    await Promise.all([
      getJob(id),
      getServices(),
      getTeamMembers(),
      getCustomers({ status: "active", perPage: 50 }),
      getChecklistTemplates(),
    ])

  if (!jobResult || "error" in jobResult || !jobResult.job) {
    notFound()
  }

  const job = jobResult.job

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

  // Compute start time and duration from scheduledStart/scheduledEnd
  const scheduledStart = new Date(job.scheduledStart)
  const scheduledEnd = new Date(job.scheduledEnd)
  const startTime = `${String(scheduledStart.getHours()).padStart(2, "0")}:${String(scheduledStart.getMinutes()).padStart(2, "0")}`
  const durationMinutes = Math.round(
    (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60)
  )

  // Map to the closest duration option
  const DURATION_VALUES = ["30", "60", "90", "120", "180", "240", "360", "480"]
  const closestDuration =
    DURATION_VALUES.find((d) => parseInt(d) >= durationMinutes) ||
    String(durationMinutes)

  // Build initialData for the JobBuilder
  const initialData = {
    id: job.id,
    customerId: job.customer.id,
    propertyId: job.property?.id || "",
    title: job.title,
    description: job.description || "",
    priority: job.priority,
    scheduledStart: job.scheduledStart,
    startTime,
    duration: closestDuration,
    assignedUserIds: job.assignments.map((a: any) => a.user.id),
    checklistItems: job.checklistItems.map((ci: any) => ci.label),
    lineItems: job.lineItems.map((li: any) => ({
      id: li.id,
      serviceId: li.serviceId || undefined,
      name: li.name,
      description: li.description || "",
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      taxable: li.taxable,
    })),
    internalNote: "",
    isRecurring: job.isRecurring,
    recurrenceRule: job.recurrenceRule,
    recurrenceEndDate: job.recurrenceEndDate,
  }

  // Get org settings for tax rate
  const { getOrganizationSettings } = await import("@/actions/settings")
  const orgResult = await getOrganizationSettings()
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
      initialData={serialize(initialData)}
      mode="edit"
    />
  )
}

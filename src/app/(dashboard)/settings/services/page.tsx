import { requireAuth } from "@/lib/auth-utils"
import { getServices } from "@/actions/settings"
import { getChecklistTemplates } from "@/actions/checklists"
import { ServiceCatalog } from "@/components/settings/service-catalog"

export default async function SettingsServicesPage() {
  await requireAuth()
  const [servicesResult, checklistsResult] = await Promise.all([
    getServices(),
    getChecklistTemplates(),
  ])

  if ("error" in servicesResult) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Services</h2>
        <p className="mt-2 text-sm text-red-500">{servicesResult.error}</p>
      </div>
    )
  }

  // Serialize Prisma Decimal fields to plain numbers for the client component
  const serializedServices = servicesResult.services.map((s: any) => ({
    ...s,
    defaultPrice: Number(s.defaultPrice),
    costPrice: s.costPrice != null ? Number(s.costPrice) : null,
    checklists: s.checklists ?? [],
  }))

  // Extract checklist templates for the multi-select in the service dialog
  const checklistTemplates =
    "error" in checklistsResult
      ? []
      : checklistsResult.templates.map((t: any) => ({ id: t.id, name: t.name }))

  return (
    <ServiceCatalog
      initialServices={serializedServices}
      checklistTemplates={checklistTemplates}
    />
  )
}

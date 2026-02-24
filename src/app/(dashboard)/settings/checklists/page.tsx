import { requireAuth } from "@/lib/auth-utils"
import { getChecklistTemplates } from "@/actions/checklists"
import { getServices } from "@/actions/settings"
import { ChecklistTemplatesManager } from "@/components/settings/checklist-templates"

export default async function SettingsChecklistsPage() {
  await requireAuth()

  const [templatesResult, servicesResult] = await Promise.all([
    getChecklistTemplates(),
    getServices(),
  ])

  if ("error" in templatesResult) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Checklist Templates
        </h2>
        <p className="mt-2 text-sm text-red-500">{templatesResult.error}</p>
      </div>
    )
  }

  const services =
    "error" in servicesResult
      ? []
      : servicesResult.services.map((s) => ({
          id: s.id,
          name: s.name,
        }))

  return (
    <ChecklistTemplatesManager
      initialTemplates={templatesResult.templates}
      services={services}
    />
  )
}

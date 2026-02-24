import { requireAuth } from "@/lib/auth-utils"
import { getServicePlans } from "@/actions/service-plans"
import { getServices } from "@/actions/settings"
import { ServicePlansManager } from "@/components/settings/service-plans-manager"

export default async function SettingsServicePlansPage() {
  await requireAuth()

  const [plansResult, servicesResult] = await Promise.all([
    getServicePlans(),
    getServices(),
  ])

  if ("error" in plansResult) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Service Plans</h2>
        <p className="mt-2 text-sm text-red-500">{plansResult.error}</p>
      </div>
    )
  }

  const services =
    !("error" in servicesResult)
      ? servicesResult.services.map((s) => ({
          id: s.id,
          name: s.name,
          defaultPrice: Number(s.defaultPrice),
          isActive: s.isActive,
        }))
      : []

  return (
    <ServicePlansManager
      initialPlans={plansResult.plans}
      availableServices={services}
    />
  )
}

import { requireAuth } from "@/lib/auth-utils"
import { getServices } from "@/actions/settings"
import { ServiceCatalog } from "@/components/settings/service-catalog"

export default async function SettingsServicesPage() {
  await requireAuth()
  const result = await getServices()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Services</h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  // Serialize Prisma Decimal fields to plain numbers for the client component
  const serializedServices = result.services.map((s) => ({
    ...s,
    defaultPrice: Number(s.defaultPrice),
  }))

  return <ServiceCatalog initialServices={serializedServices} />
}

import { requireAuth } from "@/lib/auth-utils"
import { getMarketingSuiteSettings } from "@/actions/settings"
import { MarketingSuiteSettingsForm } from "@/components/settings/marketing-suite-settings-form"

export default async function MarketingSettingsPage() {
  await requireAuth()
  const result = await getMarketingSuiteSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Marketing Suite
        </h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  return (
    <MarketingSuiteSettingsForm
      marketingSuiteEnabled={result.settings.marketingSuiteEnabled}
    />
  )
}

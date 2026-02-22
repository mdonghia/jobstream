import { requireAuth } from "@/lib/auth-utils"
import { getCommunicationSettings } from "@/actions/settings"
import { CommunicationsSettingsForm } from "@/components/settings/communications-settings-form"

export default async function SettingsCommunicationsPage() {
  await requireAuth()
  const result = await getCommunicationSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Communications
        </h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  return (
    <CommunicationsSettingsForm
      settings={result.settings}
      rules={result.rules}
    />
  )
}

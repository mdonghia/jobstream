import { requireAuth } from "@/lib/auth-utils"
import { getCommunicationSettings, getNotificationPreferences } from "@/actions/settings"
import { CommunicationsSettingsForm } from "@/components/settings/communications-settings-form"

export default async function SettingsCommunicationsPage() {
  await requireAuth()
  const [settingsResult, prefsResult] = await Promise.all([
    getCommunicationSettings(),
    getNotificationPreferences(),
  ])

  if ("error" in settingsResult) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Communications
        </h2>
        <p className="mt-2 text-sm text-red-500">{settingsResult.error}</p>
      </div>
    )
  }

  const preferences = "error" in prefsResult ? [] : prefsResult.preferences

  return (
    <CommunicationsSettingsForm
      settings={settingsResult.settings}
      preferences={preferences}
    />
  )
}

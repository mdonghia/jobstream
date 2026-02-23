import { requireAuth } from "@/lib/auth-utils"
import { getNotificationPreferences } from "@/actions/settings"
import { CommunicationsSettingsForm } from "@/components/settings/communications-settings-form"

export default async function SettingsCommunicationsPage() {
  await requireAuth()
  const prefsResult = await getNotificationPreferences()

  const preferences = "error" in prefsResult ? [] : prefsResult.preferences

  return (
    <CommunicationsSettingsForm
      preferences={preferences}
    />
  )
}

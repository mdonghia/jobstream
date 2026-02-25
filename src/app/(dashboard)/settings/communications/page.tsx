import { requireAuth } from "@/lib/auth-utils"
import { getNotificationPreferences } from "@/actions/settings"
import { getNotificationSettingsV2 } from "@/actions/notification-settings"
import { featureFlags } from "@/lib/feature-flags"
import { CommunicationsSettingsForm } from "@/components/settings/communications-settings-form"
import { NotificationSettingsV2 } from "@/components/settings/notification-settings-v2"

export default async function SettingsCommunicationsPage() {
  await requireAuth()

  // When v2Visits is enabled, show the granular notification settings UI
  if (featureFlags.v2Visits) {
    const v2Result = await getNotificationSettingsV2()
    const v2Preferences = "error" in v2Result ? [] : v2Result.preferences

    return (
      <NotificationSettingsV2
        preferences={v2Preferences}
      />
    )
  }

  // V1 fallback: original communications settings form
  const prefsResult = await getNotificationPreferences()
  const preferences = "error" in prefsResult ? [] : prefsResult.preferences

  return (
    <CommunicationsSettingsForm
      preferences={preferences}
    />
  )
}

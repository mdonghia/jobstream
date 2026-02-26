import { requireAuth } from "@/lib/auth-utils"
import { getNotificationSettingsV2 } from "@/actions/notification-settings"
import { NotificationSettingsV2 } from "@/components/settings/notification-settings-v2"

export default async function SettingsCommunicationsPage() {
  await requireAuth()

  const v2Result = await getNotificationSettingsV2()
  const v2Preferences = "error" in v2Result ? [] : v2Result.preferences

  return (
    <NotificationSettingsV2
      preferences={v2Preferences}
    />
  )
}

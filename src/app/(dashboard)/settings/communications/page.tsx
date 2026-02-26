import { requireAuth } from "@/lib/auth-utils"
import { getNotificationSettingsV2 } from "@/actions/notification-settings"
import { getOrganizationSettings } from "@/actions/settings"
import { NotificationSettingsV2 } from "@/components/settings/notification-settings-v2"

export default async function SettingsCommunicationsPage() {
  await requireAuth()

  const [v2Result, orgResult] = await Promise.all([
    getNotificationSettingsV2(),
    getOrganizationSettings(),
  ])

  const v2Preferences = "error" in v2Result ? [] : v2Result.preferences
  const reminderSettings =
    "error" in orgResult
      ? {
          invoiceRemindersEnabled: true,
          invoiceReminderDays: "3,7,14",
          quoteRemindersEnabled: true,
          quoteReminderDays: "3,7,14",
        }
      : {
          invoiceRemindersEnabled: orgResult.organization.invoiceRemindersEnabled,
          invoiceReminderDays: orgResult.organization.invoiceReminderDays,
          quoteRemindersEnabled: orgResult.organization.quoteRemindersEnabled,
          quoteReminderDays: orgResult.organization.quoteReminderDays,
        }

  return (
    <NotificationSettingsV2
      preferences={v2Preferences}
      reminderSettings={reminderSettings}
    />
  )
}

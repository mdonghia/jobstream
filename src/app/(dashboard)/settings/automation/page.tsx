import { requireAuth } from "@/lib/auth-utils"
import { getOrganizationSettings } from "@/actions/settings"
import { AutomationSettings } from "@/components/settings/automation-settings"

export default async function SettingsAutomationPage() {
  await requireAuth()
  const result = await getOrganizationSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Workflow Automation
        </h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  const org = result.organization

  return (
    <AutomationSettings
      autoConvertQuoteToJob={org.autoConvertQuoteToJob}
      autoInvoiceOnJobComplete={org.autoInvoiceOnJobComplete}
      invoiceRemindersEnabled={org.invoiceRemindersEnabled}
      invoiceReminderDays={org.invoiceReminderDays}
      quoteRemindersEnabled={org.quoteRemindersEnabled}
      quoteReminderDays={org.quoteReminderDays}
    />
  )
}

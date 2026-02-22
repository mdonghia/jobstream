import { requireAuth } from "@/lib/auth-utils"
import { getPaymentSettings } from "@/actions/settings"
import { PaymentSettingsForm } from "@/components/settings/payment-settings-form"

export default async function SettingsPaymentsPage() {
  await requireAuth()
  const result = await getPaymentSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Payments</h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  return <PaymentSettingsForm settings={result.settings} />
}

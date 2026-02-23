import { requireAuth } from "@/lib/auth-utils"
import { getPaymentSettings } from "@/actions/settings"
import { PaymentSettingsForm } from "@/components/settings/payment-settings-form"

export default async function SettingsPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>
}) {
  await requireAuth()
  const params = await searchParams
  const result = await getPaymentSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Payments</h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  const errorMessage = params.error === "stripe_not_configured"
    ? "Stripe is not configured. Please contact your administrator to set up the Stripe integration."
    : params.error === "connect_failed"
    ? "Failed to connect to Stripe. Please try again."
    : null

  const successMessage = params.connected === "true"
    ? "Successfully connected to Stripe!"
    : null

  return (
    <div>
      {errorMessage && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}
      <PaymentSettingsForm settings={result.settings} />
    </div>
  )
}

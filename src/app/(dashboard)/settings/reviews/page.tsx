import { requireAuth } from "@/lib/auth-utils"
import { getReviewSettings } from "@/actions/settings"
import { ReviewSettingsForm } from "@/components/settings/review-settings-form"

export default async function SettingsReviewsPage() {
  await requireAuth()
  const result = await getReviewSettings()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Reviews</h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  return <ReviewSettingsForm settings={result.settings} />
}

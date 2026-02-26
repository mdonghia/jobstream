"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Star, Megaphone } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { updateMarketingSuiteEnabled } from "@/actions/settings"

interface MarketingSuiteSettingsFormProps {
  marketingSuiteEnabled: boolean
}

export function MarketingSuiteSettingsForm({
  marketingSuiteEnabled,
}: MarketingSuiteSettingsFormProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(marketingSuiteEnabled)
  const [saving, setSaving] = useState(false)

  async function handleToggle(checked: boolean) {
    setEnabled(checked)
    setSaving(true)
    try {
      const result = await updateMarketingSuiteEnabled(checked)
      if ("error" in result) {
        toast.error(result.error)
        setEnabled(!checked) // Revert on error
      } else {
        toast.success(
          checked
            ? "Marketing Suite enabled -- Reviews and Campaigns are now visible in the sidebar."
            : "Marketing Suite disabled -- Reviews and Campaigns have been hidden from the sidebar."
        )
        // Refresh the page so the sidebar picks up the new setting
        router.refresh()
      }
    } catch {
      toast.error("Failed to update Marketing Suite setting")
      setEnabled(!checked) // Revert on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Marketing Suite
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Enable or disable the Marketing Suite for your organization.
          When enabled, Reviews and Campaigns will appear in the sidebar navigation.
        </p>

        <div className="mt-6 rounded-lg border border-[#E3E8EE] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#635BFF]/10">
                <Megaphone className="h-5 w-5 text-[#635BFF]" />
              </div>
              <div>
                <Label
                  htmlFor="marketing-suite-toggle"
                  className="text-sm font-semibold text-[#0A2540] cursor-pointer"
                >
                  Enable Marketing Suite
                </Label>
                <p className="text-xs text-[#8898AA] mt-0.5">
                  Show Reviews and Campaigns in the sidebar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-[#8898AA]" />}
              <Switch
                id="marketing-suite-toggle"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={saving}
                aria-label="Toggle Marketing Suite"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Show what's included when enabled */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h3 className="text-sm font-semibold text-[#0A2540]">
          What is included
        </h3>
        <p className="mt-1 text-sm text-[#425466]">
          The Marketing Suite adds the following features to your dashboard:
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-[#0A2540]">Reviews</span>
            </div>
            <p className="mt-1.5 text-xs text-[#425466]">
              Track and manage customer reviews from Google and other platforms.
              Automatically request reviews after job completion.
            </p>
          </div>

          <div className="rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#635BFF]" />
              <span className="text-sm font-medium text-[#0A2540]">Campaigns</span>
            </div>
            <p className="mt-1.5 text-xs text-[#425466]">
              Create and send targeted email and SMS marketing campaigns
              to your customer base to drive repeat business.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

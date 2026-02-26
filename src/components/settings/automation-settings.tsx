"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateWorkflowSettings } from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface AutomationSettingsProps {
  autoConvertQuoteToJob: boolean
  autoInvoiceOnJobComplete: boolean
}

// ============================================================================
// Component
// ============================================================================

export function AutomationSettings({
  autoConvertQuoteToJob: initialAutoConvert,
  autoInvoiceOnJobComplete: initialAutoInvoice,
}: AutomationSettingsProps) {
  // State
  const [autoConvertQuoteToJob, setAutoConvertQuoteToJob] = useState(
    initialAutoConvert ?? true
  )
  const [autoInvoiceOnJobComplete, setAutoInvoiceOnJobComplete] = useState(
    initialAutoInvoice ?? true
  )
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(0)

  // Clear the "Changes saved" indicator after 2.5 seconds
  useEffect(() => {
    if (lastSaved > 0) {
      const t = setTimeout(() => setLastSaved(0), 2500)
      return () => clearTimeout(t)
    }
  }, [lastSaved])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  async function handleAutoConvertToggle(checked: boolean) {
    setAutoConvertQuoteToJob(checked)
    try {
      const result = await updateWorkflowSettings({
        autoConvertQuoteToJob: checked,
      })
      if ("error" in result) {
        toast.error(result.error)
        setAutoConvertQuoteToJob(!checked) // revert on error
      } else {
        setLastSaved(Date.now())
      }
    } catch {
      toast.error("Failed to update workflow setting")
      setAutoConvertQuoteToJob(!checked) // revert on error
    }
  }

  async function handleAutoInvoiceToggle(checked: boolean) {
    setAutoInvoiceOnJobComplete(checked)
    try {
      const result = await updateWorkflowSettings({
        autoInvoiceOnJobComplete: checked,
      })
      if ("error" in result) {
        toast.error(result.error)
        setAutoInvoiceOnJobComplete(!checked)
      } else {
        setLastSaved(Date.now())
      }
    } catch {
      toast.error("Failed to update workflow setting")
      setAutoInvoiceOnJobComplete(!checked)
    }
  }

  // -----------------------------------------------------------------------
  // Save all settings at once (manual fallback)
  // -----------------------------------------------------------------------

  async function handleSaveAll() {
    setSaving(true)
    try {
      const result = await updateWorkflowSettings({
        autoConvertQuoteToJob,
        autoInvoiceOnJobComplete,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Settings saved")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Workflow Automation
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Automate common workflows to save time.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#0A2540]">
                  Automatically create a job when a quote is approved
                </Label>
                <p className="text-sm text-[#8898AA]">
                  When enabled, approved quotes are automatically converted to
                  jobs that appear in your calendar sidebar.
                </p>
              </div>
              <Switch
                checked={autoConvertQuoteToJob}
                onCheckedChange={handleAutoConvertToggle}
                aria-label="Auto-convert quotes to jobs"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#0A2540]">
                  Automatically create an invoice when a job is completed
                </Label>
                <p className="text-sm text-[#8898AA]">
                  When enabled, completing a job will automatically generate a
                  draft invoice based on the job line items.
                </p>
              </div>
              <Switch
                checked={autoInvoiceOnJobComplete}
                onCheckedChange={handleAutoInvoiceToggle}
                aria-label="Auto-create invoice on job completion"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Save Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-[#E3E8EE] pt-6 flex items-center gap-3">
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        {lastSaved > 0 && (
          <span className="text-xs text-green-600 animate-in fade-in duration-300">
            Changes saved
          </span>
        )}
      </div>
    </div>
  )
}

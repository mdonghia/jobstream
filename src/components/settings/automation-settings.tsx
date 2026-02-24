"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateWorkflowSettings } from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface AutomationSettingsProps {
  autoConvertQuoteToJob: boolean
  autoInvoiceOnJobComplete: boolean
  invoiceRemindersEnabled: boolean
  invoiceReminderDays: string | null
}

// ============================================================================
// Component
// ============================================================================

export function AutomationSettings({
  autoConvertQuoteToJob: initialAutoConvert,
  autoInvoiceOnJobComplete: initialAutoInvoice,
  invoiceRemindersEnabled: initialRemindersEnabled,
  invoiceReminderDays: initialReminderDays,
}: AutomationSettingsProps) {
  // State
  const [autoConvertQuoteToJob, setAutoConvertQuoteToJob] = useState(
    initialAutoConvert ?? true
  )
  const [autoInvoiceOnJobComplete, setAutoInvoiceOnJobComplete] = useState(
    initialAutoInvoice ?? true
  )
  const [invoiceRemindersEnabled, setInvoiceRemindersEnabled] = useState(
    initialRemindersEnabled ?? true
  )
  const [invoiceReminderDays, setInvoiceReminderDays] = useState(
    initialReminderDays ?? "3,7,14"
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

  async function handleInvoiceRemindersToggle(checked: boolean) {
    setInvoiceRemindersEnabled(checked)
    try {
      const result = await updateWorkflowSettings({
        invoiceRemindersEnabled: checked,
      })
      if ("error" in result) {
        toast.error(result.error)
        setInvoiceRemindersEnabled(!checked)
      } else {
        setLastSaved(Date.now())
      }
    } catch {
      toast.error("Failed to update workflow setting")
      setInvoiceRemindersEnabled(!checked)
    }
  }

  async function handleInvoiceReminderDaysChange(value: string) {
    setInvoiceReminderDays(value)
    try {
      const result = await updateWorkflowSettings({
        invoiceReminderDays: value,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setLastSaved(Date.now())
      }
    } catch {
      toast.error("Failed to update reminder schedule")
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
        invoiceRemindersEnabled,
        invoiceReminderDays,
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

  // -----------------------------------------------------------------------
  // Shared styles
  // -----------------------------------------------------------------------

  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"
  const inputClass = "h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"

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

          <div className="rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-[#0A2540]">
                  Send payment reminders for unpaid invoices
                </Label>
                <p className="text-sm text-[#8898AA]">
                  When enabled, automatic reminders will be sent to customers
                  with outstanding invoices on the schedule below.
                </p>
              </div>
              <Switch
                checked={invoiceRemindersEnabled}
                onCheckedChange={handleInvoiceRemindersToggle}
                aria-label="Enable invoice payment reminders"
              />
            </div>

            {invoiceRemindersEnabled && (
              <div className="mt-4 border-t border-[#E3E8EE] pt-4">
                <div className="max-w-xs space-y-1.5">
                  <Label className={labelClass}>
                    Send reminders after (days)
                  </Label>
                  <Input
                    value={invoiceReminderDays}
                    onChange={(e) => setInvoiceReminderDays(e.target.value)}
                    onBlur={(e) =>
                      handleInvoiceReminderDaysChange(e.target.value)
                    }
                    placeholder="3,7,14"
                    className={inputClass}
                    aria-label="Invoice reminder days"
                  />
                  <p className="text-xs text-[#8898AA]">
                    Comma-separated list of days after the invoice due date
                    (e.g. 3,7,14).
                  </p>
                </div>
              </div>
            )}
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

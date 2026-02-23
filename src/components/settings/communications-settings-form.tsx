"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  updateCommunicationSettings,
  updateNotificationPreferences,
} from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface NotificationPreferenceData {
  id: string
  triggerKey: string
  emailEnabled: boolean
  smsEnabled: boolean
}

interface CommunicationsSettingsFormProps {
  settings: {
    commSmsEnabled: boolean
    commEmailEnabled: boolean
  }
  preferences: NotificationPreferenceData[]
}

// ============================================================================
// Constants
// ============================================================================

const NOTIFICATION_TYPES = [
  {
    triggerKey: "quote_sent",
    name: "Quote Sent",
    description: "Notification sent when a quote is delivered to a customer.",
  },
  {
    triggerKey: "invoice_sent",
    name: "Invoice Sent",
    description: "Notification sent when an invoice is delivered to a customer.",
  },
  {
    triggerKey: "invoice_reminder",
    name: "Invoice Payment Reminder",
    description: "Reminder sent to customers with outstanding invoices.",
  },
  {
    triggerKey: "job_scheduled",
    name: "Job Scheduled",
    description: "Notification sent when a job is first scheduled for a customer.",
  },
  {
    triggerKey: "job_rescheduled",
    name: "Job Rescheduled",
    description: "Notification sent when a job's schedule is changed.",
  },
  {
    triggerKey: "booking_confirmation",
    name: "Booking Confirmation",
    description: "Confirmation sent when a customer's booking is approved.",
  },
  {
    triggerKey: "booking_decline",
    name: "Booking Declined",
    description: "Notification sent when a customer's booking cannot be accommodated.",
  },
  {
    triggerKey: "review_request",
    name: "Review Request",
    description: "Request sent to customers after job completion asking for a review.",
  },
] as const

// ============================================================================
// Component
// ============================================================================

export function CommunicationsSettingsForm({
  settings,
  preferences: initialPreferences,
}: CommunicationsSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Channel settings
  const [smsEnabled, setSmsEnabled] = useState(settings.commSmsEnabled)
  const [emailEnabled, setEmailEnabled] = useState(settings.commEmailEnabled)

  // Notification preferences -- build lookup from saved prefs, with defaults
  const [notifPrefs, setNotifPrefs] = useState<
    Record<string, { emailEnabled: boolean; smsEnabled: boolean }>
  >(() => {
    const map: Record<string, { emailEnabled: boolean; smsEnabled: boolean }> = {}
    for (const nt of NOTIFICATION_TYPES) {
      const saved = initialPreferences.find((p) => p.triggerKey === nt.triggerKey)
      map[nt.triggerKey] = {
        emailEnabled: saved ? saved.emailEnabled : true,
        smsEnabled: saved ? saved.smsEnabled : false,
      }
    }
    return map
  })

  // -----------------------------------------------------------------------
  // Channel settings save
  // -----------------------------------------------------------------------

  async function handleSaveChannels() {
    setSaving(true)
    try {
      const result = await updateCommunicationSettings({
        commSmsEnabled: smsEnabled,
        commEmailEnabled: emailEnabled,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Channel settings saved")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Notification preferences save
  // -----------------------------------------------------------------------

  async function handleSavePreferences() {
    setSavingPrefs(true)
    try {
      const updates = NOTIFICATION_TYPES.map((nt) => ({
        triggerKey: nt.triggerKey,
        emailEnabled: notifPrefs[nt.triggerKey].emailEnabled,
        smsEnabled: notifPrefs[nt.triggerKey].smsEnabled,
      }))
      const result = await updateNotificationPreferences(updates)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Notification preferences saved")
      }
    } catch {
      toast.error("Failed to save preferences")
    } finally {
      setSavingPrefs(false)
    }
  }

  // -----------------------------------------------------------------------
  // Toggle handler
  // -----------------------------------------------------------------------

  function togglePref(
    triggerKey: string,
    channel: "emailEnabled" | "smsEnabled"
  ) {
    setNotifPrefs((prev) => ({
      ...prev,
      [triggerKey]: {
        ...prev[triggerKey],
        [channel]: !prev[triggerKey][channel],
      },
    }))
  }

  // -----------------------------------------------------------------------
  // Shared styles
  // -----------------------------------------------------------------------

  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Channel Settings */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Channel Settings
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Enable or disable communication channels for your organization.
        </p>

        <div className="mt-4 space-y-3">
          {/* SMS Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
            <div>
              <Label className={labelClass}>SMS Notifications</Label>
              <p className="mt-1 text-sm text-[#425466]">
                Send text message notifications to customers.
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
              aria-label="Enable SMS notifications"
            />
          </div>

          {/* Email Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
            <div>
              <Label className={labelClass}>Email Notifications</Label>
              <p className="mt-1 text-sm text-[#425466]">
                Send email notifications to customers.
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
              aria-label="Enable email notifications"
            />
          </div>
        </div>

        {/* Save channels button */}
        <div className="mt-4">
          <Button
            onClick={handleSaveChannels}
            disabled={saving}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Channel Settings
          </Button>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Notification Preferences */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">
            Notification Preferences
          </h2>
          <p className="mt-1 text-sm text-[#425466]">
            Control which automated notifications are sent to customers via
            email and SMS.
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#E3E8EE]">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Notification
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-[#8898AA] w-20">
                  Email
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-[#8898AA] w-20">
                  SMS
                </th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_TYPES.map((nt) => (
                <tr
                  key={nt.triggerKey}
                  className="border-b border-[#E3E8EE] last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#0A2540]">
                      {nt.name}
                    </p>
                    <p className="text-xs text-[#8898AA] mt-0.5">
                      {nt.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={notifPrefs[nt.triggerKey].emailEnabled}
                      onCheckedChange={() =>
                        togglePref(nt.triggerKey, "emailEnabled")
                      }
                      aria-label={`${nt.name} email`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={notifPrefs[nt.triggerKey].smsEnabled}
                      onCheckedChange={() =>
                        togglePref(nt.triggerKey, "smsEnabled")
                      }
                      aria-label={`${nt.name} SMS`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {savingPrefs && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Preferences
          </Button>
        </div>
      </section>
    </div>
  )
}

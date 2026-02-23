"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { updateNotificationPreferences } from "@/actions/settings"

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
  preferences: NotificationPreferenceData[]
}

// ============================================================================
// Constants
// ============================================================================

const NOTIFICATION_TYPES = [
  {
    triggerKey: "quote_sent",
    name: "New Quote",
    description: "Notifies the customer when a new quote is ready to view",
  },
  {
    triggerKey: "invoice_sent",
    name: "New Invoice",
    description: "Notifies the customer when a new invoice is issued",
  },
  {
    triggerKey: "invoice_reminder",
    name: "Payment Reminder",
    description: "Reminds the customer about an outstanding invoice balance",
  },
  {
    triggerKey: "job_scheduled",
    name: "Job Scheduled",
    description: "Notifies the customer when a job is first added to their schedule",
  },
  {
    triggerKey: "job_rescheduled",
    name: "Job Rescheduled",
    description: "Notifies the customer when their scheduled job date or time changes",
  },
  {
    triggerKey: "booking_confirmation",
    name: "Booking Confirmed",
    description: "Notifies the customer that their booking request has been approved",
  },
  {
    triggerKey: "booking_decline",
    name: "Booking Declined",
    description: "Notifies the customer that their booking request could not be accommodated",
  },
  {
    triggerKey: "review_request",
    name: "Review Request",
    description: "Asks the customer for feedback after a job is completed",
  },
] as const

// ============================================================================
// Component
// ============================================================================

export function CommunicationsSettingsForm({
  preferences: initialPreferences,
}: CommunicationsSettingsFormProps) {
  const [savingPrefs, setSavingPrefs] = useState(false)

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

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Notification Preferences */}
      {/* ----------------------------------------------------------------- */}
      <section>
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

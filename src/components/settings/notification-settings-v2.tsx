"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Loader2, Bell, Users, Wrench } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { updateNotificationSettingV2 } from "@/actions/notification-settings"

// ============================================================================
// Types
// ============================================================================

interface NotificationPreferenceData {
  id: string
  triggerKey: string
  emailEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
}

interface NotificationSettingsV2Props {
  preferences: NotificationPreferenceData[]
}

type Channel = "emailEnabled" | "smsEnabled" | "inAppEnabled"

interface NotificationTypeConfig {
  triggerKey: string
  name: string
  description: string
}

interface NotificationSectionConfig {
  key: string
  title: string
  subtitle: string
  icon: React.ReactNode
  channels: Channel[]
  channelLabels: Record<string, string>
  types: NotificationTypeConfig[]
}

type PrefState = Record<
  string,
  { emailEnabled: boolean; smsEnabled: boolean; inAppEnabled: boolean }
>

// ============================================================================
// Constants -- Notification types grouped by audience
// ============================================================================

const CUSTOMER_NOTIFICATIONS: NotificationTypeConfig[] = [
  {
    triggerKey: "v2_visit_confirmed",
    name: "Visit Confirmed",
    description: "Sent when a visit is scheduled for the customer",
  },
  {
    triggerKey: "v2_visit_reminder",
    name: "Visit Reminder",
    description: "Sent 24 hours before the scheduled visit",
  },
  {
    triggerKey: "v2_tech_on_the_way",
    name: "Tech On the Way",
    description: "Sent when the technician taps 'On My Way'",
  },
  {
    triggerKey: "v2_quote_ready",
    name: "Quote Ready",
    description: "Sent when a quote is created and sent to the customer",
  },
  {
    triggerKey: "v2_quote_approved_confirmation",
    name: "Quote Approved Confirmation",
    description: "Confirmation sent after the customer approves a quote",
  },
  {
    triggerKey: "v2_invoice_sent",
    name: "Invoice Sent",
    description: "Sent when an invoice is issued to the customer",
  },
  {
    triggerKey: "v2_invoice_reminder",
    name: "Invoice Reminder",
    description: "Sent when an invoice is approaching or past due",
  },
  {
    triggerKey: "v2_payment_received",
    name: "Payment Received",
    description: "Confirmation sent after payment is received",
  },
]

const ADMIN_NOTIFICATIONS: NotificationTypeConfig[] = [
  {
    triggerKey: "v2_admin_new_scheduled_job",
    name: "New Scheduled Job",
    description: "A job was created with a scheduled visit",
  },
  {
    triggerKey: "v2_admin_new_unscheduled_job",
    name: "New Unscheduled Job",
    description: "A job was created with an unscheduled visit",
  },
  {
    triggerKey: "v2_admin_quote_approved",
    name: "Quote Approved",
    description: "A customer approved a quote",
  },
  {
    triggerKey: "v2_admin_invoice_overdue",
    name: "Invoice Overdue",
    description: "An invoice has passed its due date",
  },
]

const TECH_NOTIFICATIONS: NotificationTypeConfig[] = [
  {
    triggerKey: "v2_tech_new_visit_assigned",
    name: "New Visit Assigned",
    description: "A visit was added to the technician's schedule",
  },
  {
    triggerKey: "v2_tech_visit_rescheduled",
    name: "Visit Rescheduled",
    description: "A visit on the technician's schedule was moved or cancelled",
  },
]

const SECTIONS: NotificationSectionConfig[] = [
  {
    key: "customer",
    title: "Customer Notifications",
    subtitle: "Automated messages sent to customers about their service",
    icon: <Users className="h-5 w-5 text-[#635BFF]" />,
    channels: ["emailEnabled", "smsEnabled"],
    channelLabels: { emailEnabled: "Email", smsEnabled: "SMS" },
    types: CUSTOMER_NOTIFICATIONS,
  },
  {
    key: "admin",
    title: "Admin Notifications",
    subtitle: "Alerts sent to owners and admins about business events",
    icon: <Bell className="h-5 w-5 text-[#635BFF]" />,
    channels: ["emailEnabled", "smsEnabled", "inAppEnabled"],
    channelLabels: {
      emailEnabled: "Email",
      smsEnabled: "SMS",
      inAppEnabled: "In-App",
    },
    types: ADMIN_NOTIFICATIONS,
  },
  {
    key: "tech",
    title: "Technician Notifications",
    subtitle: "Alerts sent to field technicians about their schedule",
    icon: <Wrench className="h-5 w-5 text-[#635BFF]" />,
    channels: ["emailEnabled", "smsEnabled", "inAppEnabled"],
    channelLabels: {
      emailEnabled: "Email",
      smsEnabled: "SMS",
      inAppEnabled: "In-App",
    },
    types: TECH_NOTIFICATIONS,
  },
]

// Collect all trigger keys for default initialization
const ALL_NOTIFICATION_TYPES = [
  ...CUSTOMER_NOTIFICATIONS,
  ...ADMIN_NOTIFICATIONS,
  ...TECH_NOTIFICATIONS,
]

// ============================================================================
// Helper: Build initial state from saved preferences
// ============================================================================

function buildInitialState(
  saved: NotificationPreferenceData[]
): PrefState {
  const map: PrefState = {}
  for (const nt of ALL_NOTIFICATION_TYPES) {
    const existing = saved.find((p) => p.triggerKey === nt.triggerKey)
    map[nt.triggerKey] = {
      emailEnabled: existing ? existing.emailEnabled : true,
      smsEnabled: existing ? existing.smsEnabled : false,
      inAppEnabled: existing ? existing.inAppEnabled : false,
    }
  }
  return map
}

// ============================================================================
// Component
// ============================================================================

export function NotificationSettingsV2({
  preferences: initialPreferences,
}: NotificationSettingsV2Props) {
  const [prefs, setPrefs] = useState<PrefState>(() =>
    buildInitialState(initialPreferences)
  )
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const saveTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      for (const t of Object.values(saveTimeoutsRef.current)) {
        clearTimeout(t)
      }
    }
  }, [])

  // ----------------------------------------------------------
  // Auto-save a single notification type after debounce
  // ----------------------------------------------------------

  const autoSave = useCallback(
    (triggerKey: string, newState: PrefState) => {
      // Clear any existing timeout for this trigger key
      if (saveTimeoutsRef.current[triggerKey]) {
        clearTimeout(saveTimeoutsRef.current[triggerKey])
      }

      saveTimeoutsRef.current[triggerKey] = setTimeout(async () => {
        setSavingKey(triggerKey)
        try {
          const current = newState[triggerKey]
          const result = await updateNotificationSettingV2({
            triggerKey,
            emailEnabled: current.emailEnabled,
            smsEnabled: current.smsEnabled,
            inAppEnabled: current.inAppEnabled,
          })

          if ("error" in result) {
            toast.error(result.error)
          }
          // No success toast -- auto-save should be silent
        } catch {
          toast.error("Failed to save notification setting")
        } finally {
          setSavingKey(null)
        }
      }, 400)
    },
    []
  )

  // ----------------------------------------------------------
  // Toggle the master on/off switch for a notification type
  // When toggling off, all channels are disabled.
  // When toggling on, email is enabled by default.
  // ----------------------------------------------------------

  function toggleEnabled(triggerKey: string) {
    setPrefs((prev) => {
      const current = prev[triggerKey]
      const allOff =
        !current.emailEnabled &&
        !current.smsEnabled &&
        !current.inAppEnabled

      // If everything is off, turn on email by default
      // If at least one channel is on, turn them all off
      const newState: PrefState = {
        ...prev,
        [triggerKey]: allOff
          ? { emailEnabled: true, smsEnabled: false, inAppEnabled: false }
          : { emailEnabled: false, smsEnabled: false, inAppEnabled: false },
      }

      autoSave(triggerKey, newState)
      return newState
    })
  }

  // ----------------------------------------------------------
  // Toggle a specific channel checkbox
  // ----------------------------------------------------------

  function toggleChannel(triggerKey: string, channel: Channel) {
    setPrefs((prev) => {
      const newState: PrefState = {
        ...prev,
        [triggerKey]: {
          ...prev[triggerKey],
          [channel]: !prev[triggerKey][channel],
        },
      }

      autoSave(triggerKey, newState)
      return newState
    })
  }

  // ----------------------------------------------------------
  // Check if at least one channel is enabled
  // ----------------------------------------------------------

  function isEnabled(triggerKey: string): boolean {
    const p = prefs[triggerKey]
    return p.emailEnabled || p.smsEnabled || p.inAppEnabled
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Notification Settings
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Configure which notifications are sent and through which channels.
          Changes are saved automatically.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.key}>
          <div className="flex items-center gap-2 mb-1">
            {section.icon}
            <h3 className="text-base font-semibold text-[#0A2540]">
              {section.title}
            </h3>
          </div>
          <p className="text-sm text-[#425466] mb-3">{section.subtitle}</p>

          <div className="overflow-hidden rounded-lg border border-[#E3E8EE]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Notification
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-[#8898AA] w-16">
                    On/Off
                  </th>
                  {section.channels.map((ch) => (
                    <th
                      key={ch}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase text-[#8898AA] w-20"
                    >
                      {section.channelLabels[ch]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.types.map((nt) => {
                  const enabled = isEnabled(nt.triggerKey)
                  const isSaving = savingKey === nt.triggerKey

                  return (
                    <tr
                      key={nt.triggerKey}
                      className="border-b border-[#E3E8EE] last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                enabled
                                  ? "text-[#0A2540]"
                                  : "text-[#8898AA]"
                              }`}
                            >
                              {nt.name}
                            </p>
                            <p className="text-xs text-[#8898AA] mt-0.5">
                              {nt.description}
                            </p>
                          </div>
                          {isSaving && (
                            <Loader2 className="h-3 w-3 animate-spin text-[#635BFF] flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Master toggle */}
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={enabled}
                          onCheckedChange={() =>
                            toggleEnabled(nt.triggerKey)
                          }
                          aria-label={`Toggle ${nt.name}`}
                        />
                      </td>

                      {/* Channel checkboxes */}
                      {section.channels.map((ch) => (
                        <td key={ch} className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={prefs[nt.triggerKey][ch]}
                              onCheckedChange={() =>
                                toggleChannel(nt.triggerKey, ch)
                              }
                              disabled={!enabled}
                              aria-label={`${nt.name} ${section.channelLabels[ch]}`}
                              className={
                                !enabled
                                  ? "opacity-40 cursor-not-allowed"
                                  : ""
                              }
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

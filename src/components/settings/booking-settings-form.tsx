"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Copy, Check, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateBookingSettings } from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface ServiceItem {
  id: string
  name: string
  defaultPrice: number | string
}

interface BookingSettingsFormProps {
  settings: {
    bookingEnabled: boolean
    bookingServices: string[] | null
    bookingSlotDuration: number
    bookingBufferMinutes: number
    bookingMaxAdvanceDays: number
    slug: string
  }
  services: ServiceItem[]
}

// ============================================================================
// Slot duration options
// ============================================================================

const SLOT_DURATIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "120 minutes" },
]

const BUFFER_OPTIONS = [
  { value: "0", label: "No buffer" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
]

const ADVANCE_BOOKING_OPTIONS = [
  { value: "7", label: "1 week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "1 month" },
  { value: "60", label: "2 months" },
  { value: "90", label: "3 months" },
]

// ============================================================================
// Component
// ============================================================================

export function BookingSettingsForm({
  settings,
  services,
}: BookingSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  // Form state
  const [bookingEnabled, setBookingEnabled] = useState(settings.bookingEnabled)
  const [selectedServices, setSelectedServices] = useState<string[]>(
    settings.bookingServices ?? []
  )
  const [slotDuration, setSlotDuration] = useState(
    String(settings.bookingSlotDuration)
  )
  const [bufferMinutes, setBufferMinutes] = useState(
    String(settings.bookingBufferMinutes)
  )
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    String(settings.bookingMaxAdvanceDays)
  )

  // -----------------------------------------------------------------------
  // Service checklist toggle
  // -----------------------------------------------------------------------

  function toggleService(serviceId: string) {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  // -----------------------------------------------------------------------
  // Copy helpers
  // -----------------------------------------------------------------------

  function getBookingUrl(): string {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/book/${settings.slug}`
    }
    return `/book/${settings.slug}`
  }

  function getEmbedCode(): string {
    const url = getBookingUrl()
    return `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;"></iframe>`
  }

  async function copyToClipboard(text: string, type: "url" | "embed") {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "url") {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        setCopiedEmbed(true)
        setTimeout(() => setCopiedEmbed(false), 2000)
      }
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateBookingSettings({
        bookingEnabled,
        bookingServices: selectedServices.length > 0 ? selectedServices : null,
        bookingSlotDuration: Number(slotDuration),
        bookingBufferMinutes: Number(bufferMinutes),
        bookingMaxAdvanceDays: Number(maxAdvanceDays),
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
      {/* ----------------------------------------------------------------- */}
      {/* Online Booking Toggle */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Online Booking
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Manage your public booking page and scheduling preferences.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
          <div>
            <Label className={labelClass}>Enable Online Booking</Label>
            <p className="mt-1 text-sm text-[#425466]">
              Allow customers to request bookings through your public booking
              page.
            </p>
          </div>
          <Switch
            checked={bookingEnabled}
            onCheckedChange={setBookingEnabled}
            aria-label="Enable online booking"
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Bookable Services */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Bookable Services
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Select which services customers can book online.
        </p>

        <div className="mt-4 space-y-2">
          {services.length === 0 ? (
            <p className="text-sm text-[#8898AA]">
              No active services found. Create services in Settings &gt;
              Services first.
            </p>
          ) : (
            <>
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E3E8EE] p-3 hover:bg-[#F6F8FA] transition-colors"
                >
                  <Checkbox
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#0A2540]">
                      {service.name}
                    </span>
                    <span className="ml-2 text-sm text-[#8898AA]">
                      ${Number(service.defaultPrice).toFixed(2)}
                    </span>
                  </div>
                </label>
              ))}
              <p className="mt-2 text-xs text-[#8898AA]">
                If none selected, all services will be available for booking.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Scheduling */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">Scheduling</h2>
        <p className="mt-1 text-sm text-[#425466]">
          Configure time slot duration, buffer time, and advance booking window.
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-3 max-w-2xl">
          <div className="space-y-1.5">
            <Label className={labelClass}>Slot Duration</Label>
            <Select value={slotDuration} onValueChange={setSlotDuration}>
              <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {SLOT_DURATIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Buffer Between Appointments</Label>
            <Select value={bufferMinutes} onValueChange={setBufferMinutes}>
              <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                <SelectValue placeholder="Select buffer" />
              </SelectTrigger>
              <SelectContent>
                {BUFFER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>How Far in Advance</Label>
            <Select value={maxAdvanceDays} onValueChange={setMaxAdvanceDays}>
              <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                <SelectValue placeholder="Select window" />
              </SelectTrigger>
              <SelectContent>
                {ADVANCE_BOOKING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Your Booking URL */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Your Booking URL
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Share this link with customers or embed it on your website.
        </p>

        <div className="mt-4 space-y-4">
          {/* Booking URL */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Direct Link</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8898AA]" />
                <Input
                  readOnly
                  value={getBookingUrl()}
                  className={`${inputClass} pl-9 bg-[#F6F8FA] text-[#425466]`}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-[#E3E8EE]"
                onClick={() => copyToClipboard(getBookingUrl(), "url")}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Embed code */}
          <div className="space-y-1.5">
            <Label className={labelClass}>Embed Code</Label>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-[#E3E8EE] bg-[#F6F8FA] p-4 text-xs text-[#425466]">
                <code>{getEmbedCode()}</code>
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 border-[#E3E8EE] h-7 text-xs"
                onClick={() => copyToClipboard(getEmbedCode(), "embed")}
              >
                {copiedEmbed ? (
                  <>
                    <Check className="mr-1 h-3 w-3 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Save Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-[#E3E8EE] pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}

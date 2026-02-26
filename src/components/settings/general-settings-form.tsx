"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { US_STATES, US_TIMEZONES, DEFAULT_BUSINESS_HOURS } from "@/lib/constants"
import { AddressAutocomplete, type ParsedAddress } from "@/components/ui/address-autocomplete"
import { updateOrganizationSettings, uploadOrgFavicon, removeOrgFavicon } from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

type BusinessHours = Record<
  string,
  { start: string; end: string; open: boolean }
>

interface OrganizationData {
  id: string
  name: string
  email: string
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  timezone: string
  taxRate: number | string
  currency: string
  invoicePrefix: string
  quotePrefix: string
  jobPrefix: string
  invoiceDueDays: number
  quoteValidDays: number
  businessHours: BusinessHours | null
  favicon?: string | null
  [key: string]: unknown
}

interface GeneralSettingsFormProps {
  organization: OrganizationData
}

// ============================================================================
// Day labels for business hours table
// ============================================================================

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
}

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

// ============================================================================
// Component
// ============================================================================

export function GeneralSettingsForm({ organization }: GeneralSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleSaveRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Business details
  const [name, setName] = useState(organization.name || "")
  const [email, setEmail] = useState(organization.email || "")
  const [phone, setPhone] = useState(organization.phone || "")
  const [website, setWebsite] = useState(organization.website || "")

  // Address
  const [address, setAddress] = useState(organization.address || "")
  const [city, setCity] = useState(organization.city || "")
  const [state, setState] = useState(organization.state || "")
  const [zip, setZip] = useState(organization.zip || "")

  // Operational settings
  const [timezone, setTimezone] = useState(
    organization.timezone || "America/New_York"
  )
  const [taxRate, setTaxRate] = useState(
    String(Number(organization.taxRate || 0) * 100)
  )
  const [currency] = useState(organization.currency || "USD")

  // Document settings
  const [invoicePrefix, setInvoicePrefix] = useState(
    organization.invoicePrefix || "INV"
  )
  const [quotePrefix, setQuotePrefix] = useState(
    organization.quotePrefix || "QTE"
  )
  const [jobPrefix, setJobPrefix] = useState(
    organization.jobPrefix || "JOB"
  )
  const [invoiceDueDays, setInvoiceDueDays] = useState(
    String(organization.invoiceDueDays || 30)
  )
  const [quoteValidDays, setQuoteValidDays] = useState(
    String(organization.quoteValidDays || 30)
  )

  // Business hours
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    organization.businessHours && typeof organization.businessHours === "object"
      ? (organization.businessHours as BusinessHours)
      : DEFAULT_BUSINESS_HOURS
  )

  // Favicon
  const [faviconUrl, setFaviconUrl] = useState<string | null>(organization.favicon || null)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // -----------------------------------------------------------------------
  // Business hours helpers
  // -----------------------------------------------------------------------

  function updateDayHours(
    day: string,
    field: "start" | "end" | "open",
    value: string | boolean
  ) {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  // -----------------------------------------------------------------------
  // Favicon upload / remove
  // -----------------------------------------------------------------------

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFavicon(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadOrgFavicon(formData)

      if ("error" in result) {
        toast.error(result.error)
      } else {
        // Show a local preview immediately (the resolved URL comes on next page load)
        const objectUrl = URL.createObjectURL(file)
        setFaviconUrl(objectUrl)
        toast.success("Favicon uploaded")
      }
    } catch {
      toast.error("Failed to upload favicon")
    } finally {
      setUploadingFavicon(false)
      // Reset the input so the same file can be re-selected
      if (faviconInputRef.current) faviconInputRef.current.value = ""
    }
  }

  async function handleFaviconRemove() {
    setUploadingFavicon(true)
    try {
      const result = await removeOrgFavicon()
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setFaviconUrl(null)
        toast.success("Favicon removed")
      }
    } catch {
      toast.error("Failed to remove favicon")
    } finally {
      setUploadingFavicon(false)
    }
  }

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Business name is required")
      return
    }
    if (!email.trim()) {
      toast.error("Business email is required")
      return
    }

    setSaving(true)
    try {
      const result = await updateOrganizationSettings({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state || undefined,
        zip: zip.trim() || undefined,
        timezone,
        taxRate: (Number(taxRate) || 0) / 100,
        currency,
        invoicePrefix: invoicePrefix.trim(),
        quotePrefix: quotePrefix.trim(),
        jobPrefix: jobPrefix.trim(),
        invoiceDueDays: Number(invoiceDueDays) || 30,
        quoteValidDays: Number(quoteValidDays) || 30,
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

  // Keep a ref to the latest handleSave so the debounced timeout always
  // calls the version with the most recent state values.
  handleSaveRef.current = handleSave

  // -----------------------------------------------------------------------
  // Auto-save helpers
  // -----------------------------------------------------------------------

  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await handleSaveRef.current()
      setLastSaved(Date.now())
    }, 500)
  }, [])

  // Clear the "Changes saved" indicator after 2.5 seconds
  useEffect(() => {
    if (lastSaved > 0) {
      const t = setTimeout(() => setLastSaved(0), 2500)
      return () => clearTimeout(t)
    }
  }, [lastSaved])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // -----------------------------------------------------------------------
  // Shared label + input styles
  // -----------------------------------------------------------------------

  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"
  const inputClass = "h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
  const selectTriggerClass =
    "h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]"

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Business Details */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Business Details
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Core information about your business.
        </p>

        {/* Favicon upload */}
        <div className="mt-4 flex items-center gap-4">
          <div className="relative">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt="Company favicon"
                className="w-12 h-12 rounded-lg object-cover border border-[#E3E8EE]"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#635BFF] flex items-center justify-center border border-[#E3E8EE]">
                <span className="text-white text-lg font-bold">
                  {name.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label className={labelClass}>Company Icon</Label>
            <div className="flex items-center gap-2">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                onChange={handleFaviconUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploadingFavicon}
                className="h-8 text-xs border-[#E3E8EE]"
              >
                {uploadingFavicon ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3 w-3" />
                )}
                Upload
              </Button>
              {faviconUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFaviconRemove}
                  disabled={uploadingFavicon}
                  className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="mr-1.5 h-3 w-3" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-[#8898AA]">
              PNG, JPG, or SVG. Max 512KB.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className={labelClass}>Business Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="Your Business Name"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Business Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="hello@example.com"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Website</Label>
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="https://www.example.com"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Address */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">Address</h2>
        <p className="mt-1 text-sm text-[#425466]">
          Your business address for invoices and quotes.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={labelClass}>Street Address</Label>
            <AddressAutocomplete
              value={address}
              onChange={(val) => { setAddress(val) }}
              onAddressSelect={(addr: ParsedAddress) => {
                setAddress(addr.addressLine1)
                if (addr.city) setCity(addr.city)
                if (addr.state) setState(addr.state)
                if (addr.zip) setZip(addr.zip)
                triggerAutoSave()
              }}
              placeholder="123 Main Street"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>City</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="New York"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>State</Label>
              <Select value={state} onValueChange={(v) => { setState(v); triggerAutoSave() }}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>ZIP Code</Label>
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                onBlur={triggerAutoSave}
                placeholder="10001"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Operational Settings */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Operational Settings
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Configure timezone, tax rates, and currency.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className={labelClass}>Timezone</Label>
            <Select value={timezone} onValueChange={(v) => { setTimezone(v); triggerAutoSave() }}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Default Tax Rate (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Currency</Label>
            <Input
              value="USD - US Dollar"
              disabled
              className={`${inputClass} bg-[#F6F8FA] text-[#8898AA]`}
              aria-label="Currency"
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Document Settings */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Document Settings
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Configure prefixes and default terms for documents.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className={labelClass}>Invoice Prefix</Label>
            <Input
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="INV"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Quote Prefix</Label>
            <Input
              value={quotePrefix}
              onChange={(e) => setQuotePrefix(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="QTE"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Job Prefix</Label>
            <Input
              value={jobPrefix}
              onChange={(e) => setJobPrefix(e.target.value)}
              onBlur={triggerAutoSave}
              placeholder="JOB"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Default Invoice Due (days)</Label>
            <Input
              type="number"
              min="1"
              value={invoiceDueDays}
              onChange={(e) => setInvoiceDueDays(e.target.value)}
              onBlur={triggerAutoSave}
              className={inputClass}
              aria-label="Default invoice due days"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Default Quote Validity (days)
            </Label>
            <Input
              type="number"
              min="1"
              value={quoteValidDays}
              onChange={(e) => setQuoteValidDays(e.target.value)}
              onBlur={triggerAutoSave}
              className={inputClass}
              aria-label="Default quote validity days"
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Business Hours */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Business Hours
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Set the hours your business operates each day.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-[#E3E8EE]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Day
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Open
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Start Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  End Time
                </th>
              </tr>
            </thead>
            <tbody>
              {DAY_ORDER.map((day) => {
                const hours = businessHours[day] || {
                  start: "08:00",
                  end: "17:00",
                  open: false,
                }
                return (
                  <tr
                    key={day}
                    className="border-b border-[#E3E8EE] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                      {DAY_LABELS[day]}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={hours.open}
                        onCheckedChange={(checked) => {
                          updateDayHours(day, "open", checked)
                          triggerAutoSave()
                        }}
                        aria-label={`${DAY_LABELS[day]} open`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={hours.start}
                        onChange={(e) =>
                          updateDayHours(day, "start", e.target.value)
                        }
                        onBlur={triggerAutoSave}
                        disabled={!hours.open}
                        className={`h-9 w-32 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${
                          !hours.open ? "opacity-40" : ""
                        }`}
                        aria-label={`${DAY_LABELS[day]} start time`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={hours.end}
                        onChange={(e) =>
                          updateDayHours(day, "end", e.target.value)
                        }
                        onBlur={triggerAutoSave}
                        disabled={!hours.open}
                        className={`h-9 w-32 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${
                          !hours.open ? "opacity-40" : ""
                        }`}
                        aria-label={`${DAY_LABELS[day]} end time`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Save Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-[#E3E8EE] pt-6 flex items-center gap-3">
        <Button
          onClick={handleSave}
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

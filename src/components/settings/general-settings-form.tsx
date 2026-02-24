"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
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
import { updateOrganizationSettings, updateWorkflowSettings } from "@/actions/settings"

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
  autoConvertQuoteToJob: boolean
  autoInvoiceOnJobComplete: boolean
  invoiceRemindersEnabled: boolean
  invoiceReminderDays: string | null
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

  // Workflow automation
  const [autoConvertQuoteToJob, setAutoConvertQuoteToJob] = useState(
    organization.autoConvertQuoteToJob ?? true
  )
  const [autoInvoiceOnJobComplete, setAutoInvoiceOnJobComplete] = useState(
    organization.autoInvoiceOnJobComplete ?? true
  )
  const [invoiceRemindersEnabled, setInvoiceRemindersEnabled] = useState(
    organization.invoiceRemindersEnabled ?? true
  )
  const [invoiceReminderDays, setInvoiceReminderDays] = useState(
    organization.invoiceReminderDays ?? "3,7,14"
  )

  // -----------------------------------------------------------------------
  // Workflow automation handler
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
        toast.success("Workflow setting updated")
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
        toast.success("Workflow setting updated")
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
        toast.success("Workflow setting updated")
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
        toast.success("Reminder schedule updated")
      }
    } catch {
      toast.error("Failed to update reminder schedule")
    }
  }

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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className={labelClass}>Business Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>City</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>State</Label>
              <Select value={state} onValueChange={setState}>
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
            <Select value={timezone} onValueChange={setTimezone}>
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
              placeholder="INV"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Quote Prefix</Label>
            <Input
              value={quotePrefix}
              onChange={(e) => setQuotePrefix(e.target.value)}
              placeholder="QTE"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Job Prefix</Label>
            <Input
              value={jobPrefix}
              onChange={(e) => setJobPrefix(e.target.value)}
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
                        onCheckedChange={(checked) =>
                          updateDayHours(day, "open", checked)
                        }
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
      {/* Workflow Automation */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
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

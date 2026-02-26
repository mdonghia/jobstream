"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Loader2,
  Clock,
  ArrowLeft,
  ArrowRight,
  User,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { AddressAutocomplete, type ParsedAddress } from "@/components/ui/address-autocomplete"
import { createPublicBooking, getAvailableSlots } from "@/actions/bookings"

// ============================================================================
// Types
// ============================================================================

interface Service {
  id: string
  name: string
  description: string | null
  defaultPrice: number
  estimatedMinutes: number | null
}

interface PublicBookingFormProps {
  slug: string
  orgName: string
  services: Service[]
  businessHours: Record<
    string,
    { start: string; end: string; open: boolean }
  > | null
  slotDuration: number
  maxAdvanceDays: number
}

// ============================================================================
// Helpers
// ============================================================================

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
]

/** Convert "14:00" to "2:00 PM" */
function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`
}

/** Format date as readable string */
function formatDateReadable(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** Format date as YYYY-MM-DD */
function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

// ============================================================================
// Steps
// ============================================================================

const STEPS = [
  { label: "Service", icon: CalendarIcon },
  { label: "Date", icon: CalendarIcon },
  { label: "Time", icon: Clock },
  { label: "Info", icon: User },
  { label: "Confirm", icon: CheckCircle2 },
]

// ============================================================================
// Component
// ============================================================================

export function PublicBookingForm({
  slug,
  orgName,
  services,
  businessHours,
  slotDuration,
  maxAdvanceDays,
}: PublicBookingFormProps) {
  // Step state
  const [step, setStep] = useState(services.length > 0 ? 0 : 1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Wizard data
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")

  // Contact info
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [message, setMessage] = useState("")

  // Slots loading
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Date constraints
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)

  // Determine which days of the week are closed based on business hours
  const getClosedDays = useCallback((): number[] => {
    if (!businessHours) return [0, 6] // default: closed sun/sat
    const dayMap: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    }
    const closed: number[] = []
    for (const [key, val] of Object.entries(businessHours)) {
      if (!val.open && dayMap[key] !== undefined) {
        closed.push(dayMap[key])
      }
    }
    return closed
  }, [businessHours])

  const closedDays = getClosedDays()

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedDate) return

    const dateStr = toDateString(selectedDate)

    setLoadingSlots(true)
    setSelectedTimeSlot("")
    setSlots([])

    getAvailableSlots(slug, selectedService?.id ?? null, dateStr)
      .then((result) => {
        if ("error" in result) {
          toast.error(result.error)
          setSlots([])
        } else {
          setSlots(result.slots ?? [])
        }
      })
      .catch(() => {
        toast.error("Failed to load available time slots")
        setSlots([])
      })
      .finally(() => {
        setLoadingSlots(false)
      })
  }, [selectedDate, selectedService, slug])

  // Navigation
  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, services.length > 0 ? 0 : 1))
  }

  // Submit
  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    if (!email.trim()) {
      toast.error("Email is required")
      return
    }

    setSubmitting(true)
    try {
      const result = await createPublicBooking({
        organizationSlug: slug,
        serviceId: selectedService?.id,
        serviceName: selectedService?.name,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        preferredDate: selectedDate
          ? toDateString(selectedDate)
          : undefined,
        preferredTime: selectedTimeSlot
          ? formatTime12h(selectedTimeSlot)
          : undefined,
        preferredTimeSlot: selectedTimeSlot || undefined,
        message: message.trim() || undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        setSubmitted(true)
      }
    } catch {
      toast.error("Failed to submit booking request")
    } finally {
      setSubmitting(false)
    }
  }

  // Reset all fields
  function resetForm() {
    setSubmitted(false)
    setStep(services.length > 0 ? 0 : 1)
    setSelectedService(null)
    setSelectedDate(undefined)
    setSelectedTimeSlot("")
    setSlots([])
    setName("")
    setEmail("")
    setPhone("")
    setAddressLine1("")
    setCity("")
    setState("")
    setZip("")
    setMessage("")
  }

  // ============================================================================
  // Success state
  // ============================================================================

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-[#0A2540]">
          Booking Request Submitted!
        </h2>
        <p className="mt-2 text-sm text-[#425466] max-w-sm mx-auto">
          Thank you for your booking request. {orgName} will review it and get
          back to you shortly.
        </p>
        <Button
          className="mt-6 bg-[#635BFF] hover:bg-[#5851ea] text-white"
          onClick={resetForm}
        >
          Submit Another Request
        </Button>
      </div>
    )
  }

  // ============================================================================
  // Step progress bar
  // ============================================================================

  const activeSteps = services.length > 0 ? STEPS : STEPS.slice(1)
  const adjustedStep = services.length > 0 ? step : step - 1

  const progressBar = (
    <div className="flex items-center justify-center gap-1 py-4 px-6 border-b border-[#E3E8EE]">
      {activeSteps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              i === adjustedStep
                ? "bg-[#635BFF] text-white"
                : i < adjustedStep
                  ? "bg-green-100 text-green-700"
                  : "bg-[#F6F8FA] text-[#8898AA]"
            }`}
          >
            {i < adjustedStep ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <s.icon className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < activeSteps.length - 1 && (
            <div
              className={`w-6 h-0.5 mx-1 rounded ${
                i < adjustedStep ? "bg-green-300" : "bg-[#E3E8EE]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  // ============================================================================
  // Step 0: Select Service
  // ============================================================================

  const stepService = (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Select a Service
        </h2>
        <p className="text-sm text-[#425466] mt-1">
          Choose the service you need.
        </p>
      </div>

      <div className="grid gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => {
              setSelectedService(service)
              goNext()
            }}
            className={`w-full text-left rounded-lg border p-4 transition-all hover:border-[#635BFF] hover:shadow-sm ${
              selectedService?.id === service.id
                ? "border-[#635BFF] bg-[#635BFF]/5 ring-1 ring-[#635BFF]"
                : "border-[#E3E8EE]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-[#0A2540]">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-[#425466] mt-1">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {service.estimatedMinutes && (
                    <span className="text-xs text-[#8898AA] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {service.estimatedMinutes} min
                    </span>
                  )}
                </div>
              </div>
              {service.defaultPrice > 0 && (
                <span className="text-sm font-semibold text-[#635BFF] whitespace-nowrap ml-4">
                  from ${service.defaultPrice.toFixed(2)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ============================================================================
  // Step 1: Select Date
  // ============================================================================

  const stepDate = (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Pick a Date
        </h2>
        <p className="text-sm text-[#425466] mt-1">
          Select your preferred date for the appointment.
        </p>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date ?? undefined)
          }}
          disabled={[
            { before: today },
            { after: maxDate },
            (date) => closedDays.includes(date.getDay()),
          ]}
          className="rounded-lg border border-[#E3E8EE]"
        />
      </div>

      <div className="flex justify-between pt-2">
        {services.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            className="border-[#E3E8EE]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <div className="ml-auto">
          <Button
            type="button"
            disabled={!selectedDate}
            onClick={goNext}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )

  // ============================================================================
  // Step 2: Select Time Slot
  // ============================================================================

  const stepTime = (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Select a Time
        </h2>
        <p className="text-sm text-[#425466] mt-1">
          {selectedDate
            ? `Available times for ${formatDateReadable(selectedDate)}`
            : "Select a date first"}
        </p>
      </div>

      {loadingSlots ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#635BFF]" />
          <span className="ml-2 text-sm text-[#425466]">
            Loading available times...
          </span>
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-8 h-8 text-[#8898AA] mx-auto mb-2" />
          <p className="text-sm text-[#425466]">
            No availability on this date. Please select another date.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            className="mt-4 border-[#E3E8EE]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Choose Another Date
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTimeSlot(slot)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  selectedTimeSlot === slot
                    ? "border-[#635BFF] bg-[#635BFF] text-white"
                    : "border-[#E3E8EE] text-[#0A2540] hover:border-[#635BFF] hover:bg-[#635BFF]/5"
                }`}
              >
                {formatTime12h(slot)}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="border-[#E3E8EE]"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              type="button"
              disabled={!selectedTimeSlot}
              onClick={goNext}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  )

  // ============================================================================
  // Step 3: Contact Info
  // ============================================================================

  const stepInfo = (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Your Information
        </h2>
        <p className="text-sm text-[#425466] mt-1">
          Tell us how to reach you.
        </p>
      </div>

      {/* Contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold uppercase text-[#8898AA]">
            Your Name *
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-[#8898AA]">
            Email *
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-[#8898AA]">
            Phone
          </Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-[#8898AA]">
            Street Address
          </Label>
          <AddressAutocomplete
            value={addressLine1}
            onChange={(val) => setAddressLine1(val)}
            onAddressSelect={(addr: ParsedAddress) => {
              setAddressLine1(addr.addressLine1)
              if (addr.city) setCity(addr.city)
              if (addr.state) setState(addr.state)
              if (addr.zip) setZip(addr.zip)
            }}
            placeholder="123 Main St"
            className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              City
            </Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              State
            </Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              ZIP
            </Label>
            <Input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP"
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase text-[#8898AA]">
          Message
        </Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the work you need done..."
          className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
          rows={3}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          className="border-[#E3E8EE]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          type="button"
          disabled={!name.trim() || !email.trim()}
          onClick={goNext}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          Review & Confirm <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )

  // ============================================================================
  // Step 4: Confirmation
  // ============================================================================

  const stepConfirm = (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Confirm Your Booking
        </h2>
        <p className="text-sm text-[#425466] mt-1">
          Review your details below and submit.
        </p>
      </div>

      <div className="rounded-lg border border-[#E3E8EE] divide-y divide-[#E3E8EE]">
        {selectedService && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-[#635BFF]" />
            </div>
            <div>
              <p className="text-xs text-[#8898AA] uppercase font-semibold">
                Service
              </p>
              <p className="text-sm font-medium text-[#0A2540]">
                {selectedService.name}
                {selectedService.defaultPrice > 0 && (
                  <span className="text-[#635BFF] ml-2">
                    from ${selectedService.defaultPrice.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {selectedDate && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-[#635BFF]" />
            </div>
            <div>
              <p className="text-xs text-[#8898AA] uppercase font-semibold">
                Date & Time
              </p>
              <p className="text-sm font-medium text-[#0A2540]">
                {formatDateReadable(selectedDate)}
                {selectedTimeSlot && (
                  <span className="text-[#635BFF] ml-2">
                    at {formatTime12h(selectedTimeSlot)}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[#635BFF]" />
          </div>
          <div>
            <p className="text-xs text-[#8898AA] uppercase font-semibold">
              Contact
            </p>
            <p className="text-sm font-medium text-[#0A2540]">{name}</p>
            <p className="text-sm text-[#425466]">
              {email}
              {phone && ` / ${phone}`}
            </p>
          </div>
        </div>

        {(addressLine1 || city) && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-[#635BFF]" />
            </div>
            <div>
              <p className="text-xs text-[#8898AA] uppercase font-semibold">
                Address
              </p>
              <p className="text-sm text-[#0A2540]">
                {[addressLine1, city, state, zip].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
        )}

        {message && (
          <div className="p-4">
            <p className="text-xs text-[#8898AA] uppercase font-semibold mb-1">
              Message
            </p>
            <p className="text-sm text-[#425466]">{message}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          className="border-[#E3E8EE]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitting ? "Submitting..." : "Submit Booking Request"}
        </Button>
      </div>
    </div>
  )

  // ============================================================================
  // Render
  // ============================================================================

  const stepContent = [stepService, stepDate, stepTime, stepInfo, stepConfirm]

  return (
    <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#E3E8EE]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-[#635BFF]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A2540]">
              Book an Appointment
            </h1>
            <p className="text-sm text-[#425466]">
              Schedule a time that works for you with {orgName}.
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      {progressBar}

      {/* Current step content */}
      {stepContent[step]}
    </div>
  )
}

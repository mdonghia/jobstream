"use client"

import { useState } from "react"
import { Calendar, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createPublicBooking } from "@/actions/bookings"

interface Service {
  id: string
  name: string
  description: string | null
  defaultPrice: number
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
}

const TIME_PREFERENCES = [
  { value: "Morning", label: "Morning" },
  { value: "Afternoon", label: "Afternoon" },
]

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
]

export function PublicBookingForm({
  slug,
  orgName,
  services,
}: PublicBookingFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [serviceName, setServiceName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [message, setMessage] = useState("")

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

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
        serviceName: serviceName || undefined,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        preferredDate: date || undefined,
        preferredTime: time || undefined,
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
          onClick={() => {
            setSubmitted(false)
            setName("")
            setEmail("")
            setPhone("")
            setAddressLine1("")
            setCity("")
            setState("")
            setZip("")
            setDate("")
            setTime("")
            setMessage("")
            setServiceName("")
          }}
        >
          Submit Another Request
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden">
      <div className="p-6 border-b border-[#E3E8EE]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#635BFF]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A2540]">
              Request a Booking
            </h1>
            <p className="text-sm text-[#425466]">
              Fill out the form below and we&apos;ll get back to you to confirm.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Service Selection */}
        {services.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              Service
            </Label>
            <Select value={serviceName} onValueChange={setServiceName}>
              <SelectTrigger className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{s.name}</span>
                      {s.defaultPrice > 0 && (
                        <span className="text-xs text-[#8898AA]">
                          from ${s.defaultPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Contact Info */}
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
            <Input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
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

        {/* Date & Time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              Preferred Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
              }}
              min={today}
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              Preferred Time
            </Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PREFERENCES.map((tp) => (
                  <SelectItem key={tp.value} value={tp.value}>
                    {tp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            rows={4}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-[#635BFF] hover:bg-[#5851ea] text-white text-base"
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitting ? "Submitting..." : "Request Booking"}
        </Button>
      </form>
    </div>
  )
}

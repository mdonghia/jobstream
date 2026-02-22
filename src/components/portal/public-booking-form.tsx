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

function generateTimeSlots(
  businessHours: Record<
    string,
    { start: string; end: string; open: boolean }
  > | null,
  date: string,
  slotDuration: number
): string[] {
  if (!date || !businessHours) {
    // Default slots if no business hours set
    const slots: string[] = []
    for (let h = 8; h < 18; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`)
      if (slotDuration <= 30) {
        slots.push(`${h.toString().padStart(2, "0")}:30`)
      }
    }
    return slots
  }

  const dayOfWeek = new Date(date + "T12:00:00").getDay()
  const dayMap: Record<number, string> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  }
  const dayKey = dayMap[dayOfWeek]
  const dayHours = businessHours[dayKey]

  if (!dayHours || !dayHours.open) return []

  const [startH, startM] = dayHours.start.split(":").map(Number)
  const [endH, endM] = dayHours.end.split(":").map(Number)
  const startMinutes = startH * 60 + (startM || 0)
  const endMinutes = endH * 60 + (endM || 0)

  const slots: string[] = []
  for (let m = startMinutes; m < endMinutes; m += slotDuration) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(
      `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
    )
  }
  return slots
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`
}

export function PublicBookingForm({
  slug,
  orgName,
  services,
  businessHours,
  slotDuration,
}: PublicBookingFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [serviceName, setServiceName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [message, setMessage] = useState("")

  const timeSlots = generateTimeSlots(businessHours, date, slotDuration)

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
        address: address.trim() || undefined,
        preferredDate: date || undefined,
        preferredTime: time ? formatTime(time) : undefined,
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
            setAddress("")
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
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-[#8898AA]">
            Service Address
          </Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, State"
            className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
          />
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
                setTime("")
              }}
              min={today}
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-[#8898AA]">
              Preferred Time
            </Label>
            {timeSlots.length > 0 ? (
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {formatTime(slot)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : date ? (
              <p className="h-10 flex items-center text-sm text-[#8898AA]">
                No availability on this date
              </p>
            ) : (
              <Select disabled>
                <SelectTrigger className="h-10 border-[#E3E8EE]">
                  <SelectValue placeholder="Select a date first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">-</SelectItem>
                </SelectContent>
              </Select>
            )}
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

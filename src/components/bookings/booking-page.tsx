"use client"

import { useState, useCallback, useEffect } from "react"
import {
  CalendarPlus,
  Check,
  X,
  Search,
  CalendarIcon,
  User,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Booking {
  id: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  serviceName: string | null
  serviceId: string | null
  preferredDate: string | null
  preferredTime: string | null
  address: string | null
  message: string | null
  status: "PENDING" | "CONFIRMED" | "DECLINED"
  declineReason: string | null
  createdAt: string
}

interface TeamMember {
  id: string
  name: string
}

interface BookingPageProps {
  initialBookings?: Booking[]
  initialTeamMembers?: TeamMember[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  DECLINED: {
    label: "Declined",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingPage({
  initialBookings = [],
  initialTeamMembers = [],
}: BookingPageProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [teamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [activeTab, setActiveTab] = useState("PENDING")
  const [loading, setLoading] = useState(false)

  // Confirm dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmingBooking, setConfirmingBooking] = useState<Booking | null>(
    null
  )
  const [confirmDate, setConfirmDate] = useState("")
  const [confirmTime, setConfirmTime] = useState("")
  const [confirmTeamMemberId, setConfirmTeamMemberId] = useState("")

  // Decline dialog state
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [decliningBooking, setDecliningBooking] = useState<Booking | null>(null)
  const [declineReason, setDeclineReason] = useState("")

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      const mod = await import("@/actions/bookings").catch(() => null)
      if (mod?.getBookings) {
        setLoading(true)
        const result = await mod.getBookings({ status: activeTab })
        if (result && !("error" in result)) {
          setBookings((result.bookings ?? []).map((b: any) => ({
            ...b,
            serviceName: b.service?.name ?? null,
            createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
            preferredDate: b.preferredDate instanceof Date ? b.preferredDate.toISOString() : b.preferredDate,
          })))
        }
        setLoading(false)
      }
    } catch {
      // Server actions not yet available
    }
  }, [activeTab])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length
  const confirmedCount = bookings.filter(
    (b) => b.status === "CONFIRMED"
  ).length
  const declinedCount = bookings.filter((b) => b.status === "DECLINED").length

  const filteredBookings = bookings.filter((b) => b.status === activeTab)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function openConfirmDialog(booking: Booking) {
    setConfirmingBooking(booking)
    setConfirmDate(
      booking.preferredDate
        ? format(new Date(booking.preferredDate), "yyyy-MM-dd")
        : ""
    )
    setConfirmTime(booking.preferredTime ?? "09:00")
    setConfirmTeamMemberId("")
    setConfirmDialogOpen(true)
  }

  function openDeclineDialog(booking: Booking) {
    setDecliningBooking(booking)
    setDeclineReason("")
    setDeclineDialogOpen(true)
  }

  async function handleConfirm() {
    if (!confirmingBooking) return
    if (!confirmDate || !confirmTime) {
      toast.error("Please provide a date and time")
      return
    }

    try {
      const mod = await import("@/actions/bookings").catch(() => null)
      if (mod?.confirmBooking) {
        const scheduledStart = new Date(`${confirmDate}T${confirmTime}:00`)
        const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours
        const result = await mod.confirmBooking(confirmingBooking.id, {
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          assignedUserIds: confirmTeamMemberId && confirmTeamMemberId !== "unassigned"
            ? [confirmTeamMemberId]
            : undefined,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Booking confirmed and job created")
      } else {
        // Mock: update locally
        setBookings((prev) =>
          prev.map((b) =>
            b.id === confirmingBooking.id
              ? { ...b, status: "CONFIRMED" as const }
              : b
          )
        )
        toast.success("Booking confirmed locally")
      }
      setConfirmDialogOpen(false)
      fetchBookings()
    } catch {
      toast.error("Failed to confirm booking")
    }
  }

  async function handleDecline() {
    if (!decliningBooking) return

    try {
      const mod = await import("@/actions/bookings").catch(() => null)
      if (mod?.declineBooking) {
        const result = await mod.declineBooking(
          decliningBooking.id,
          declineReason || undefined
        )
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Booking declined")
      } else {
        // Mock: update locally
        setBookings((prev) =>
          prev.map((b) =>
            b.id === decliningBooking.id
              ? {
                  ...b,
                  status: "DECLINED" as const,
                  declineReason: declineReason || null,
                }
              : b
          )
        )
        toast.success("Booking declined locally")
      }
      setDeclineDialogOpen(false)
      fetchBookings()
    } catch {
      toast.error("Failed to decline booking")
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Bookings</h1>
        <p className="text-sm text-[#8898AA] mt-0.5">
          Manage online booking requests from customers
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v)}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="PENDING">
            Pending
            {pendingCount > 0 && (
              <Badge className="ml-1.5 bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="CONFIRMED">
            Confirmed
            {confirmedCount > 0 && (
              <Badge className="ml-1.5 bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
                {confirmedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="DECLINED">
            Declined
            {declinedCount > 0 && (
              <Badge className="ml-1.5 bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
                {declinedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All tab content shares the same table layout */}
        {["PENDING", "CONFIRMED", "DECLINED"].map((status) => (
          <TabsContent key={status} value={status}>
            {filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-lg border border-[#E3E8EE]">
                <CalendarPlus className="w-12 h-12 text-[#8898AA] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A2540] mb-1">
                  No booking requests{" "}
                  {status === "PENDING"
                    ? "yet"
                    : status === "CONFIRMED"
                      ? "confirmed"
                      : "declined"}
                </h3>
                <p className="text-sm text-[#8898AA] max-w-sm">
                  {status === "PENDING"
                    ? "When customers submit booking requests, they will appear here."
                    : status === "CONFIRMED"
                      ? "Confirmed bookings will appear here after you approve pending requests."
                      : "Declined bookings will appear here."}
                </p>
              </div>
            ) : (
              <div
                className={`bg-white rounded-lg border border-[#E3E8EE] overflow-hidden ${loading ? "opacity-50" : ""}`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Date Requested
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Customer Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Service
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Preferred Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => {
                        const cfg = statusConfig[booking.status]
                        return (
                          <tr
                            key={booking.id}
                            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50"
                          >
                            <td className="px-4 py-3 text-sm text-[#425466]">
                              {format(
                                new Date(booking.createdAt),
                                "MMM d, yyyy"
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-[#0A2540]">
                                  {booking.customerName}
                                </p>
                                {booking.customerEmail && (
                                  <p className="text-xs text-[#8898AA]">
                                    {booking.customerEmail}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#425466]">
                              {booking.serviceName ?? (
                                <span className="text-[#8898AA]">--</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#425466]">
                              {booking.preferredDate
                                ? format(
                                    new Date(booking.preferredDate),
                                    "MMM d, yyyy"
                                  )
                                : "--"}
                              {booking.preferredTime && (
                                <span className="text-[#8898AA] ml-1">
                                  at {booking.preferredTime}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={`${cfg.bg} ${cfg.color} text-xs`}
                              >
                                {cfg.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {booking.status === "PENDING" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                                    onClick={() => openConfirmDialog(booking)}
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                                    onClick={() => openDeclineDialog(booking)}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              )}
                              {booking.status === "CONFIRMED" && (
                                <span className="text-xs text-[#8898AA]">
                                  Job created
                                </span>
                              )}
                              {booking.status === "DECLINED" &&
                                booking.declineReason && (
                                  <span
                                    className="text-xs text-[#8898AA] truncate max-w-[150px] block"
                                    title={booking.declineReason}
                                  >
                                    {booking.declineReason}
                                  </span>
                                )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              Confirm Booking
            </DialogTitle>
            <DialogDescription className="text-[#8898AA]">
              Schedule a date/time and assign a team member to create a job.
            </DialogDescription>
          </DialogHeader>

          {confirmingBooking && (
            <div className="space-y-4 py-2">
              <div className="bg-[#F6F8FA] rounded-lg p-3 border border-[#E3E8EE]">
                <p className="text-sm font-medium text-[#0A2540]">
                  {confirmingBooking.customerName}
                </p>
                <p className="text-xs text-[#8898AA] mt-0.5">
                  {confirmingBooking.serviceName ?? "No service specified"}{" "}
                  {confirmingBooking.preferredDate &&
                    `-- Preferred: ${format(new Date(confirmingBooking.preferredDate), "MMM d, yyyy")}`}
                </p>
                {confirmingBooking.message && (
                  <p className="text-xs text-[#425466] mt-2 italic">
                    &ldquo;{confirmingBooking.message}&rdquo;
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm text-[#425466]">
                  <CalendarIcon className="w-3.5 h-3.5 inline mr-1.5" />
                  Scheduled Date
                </Label>
                <Input
                  type="date"
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>

              <div>
                <Label className="text-sm text-[#425466]">
                  <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                  Scheduled Time
                </Label>
                <Input
                  type="time"
                  value={confirmTime}
                  onChange={(e) => setConfirmTime(e.target.value)}
                  className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>

              <div>
                <Label className="text-sm text-[#425466]">
                  <User className="w-3.5 h-3.5 inline mr-1.5" />
                  Assign Team Member (optional)
                </Label>
                <Select
                  value={confirmTeamMemberId}
                  onValueChange={setConfirmTeamMemberId}
                >
                  <SelectTrigger className="mt-1.5 h-10 border-[#E3E8EE]">
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              className="border-[#E3E8EE] text-[#425466]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Confirm & Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              Decline Booking
            </DialogTitle>
            <DialogDescription className="text-[#8898AA]">
              Optionally provide a reason for declining this booking request.
            </DialogDescription>
          </DialogHeader>

          {decliningBooking && (
            <div className="space-y-4 py-2">
              <div className="bg-[#F6F8FA] rounded-lg p-3 border border-[#E3E8EE]">
                <p className="text-sm font-medium text-[#0A2540]">
                  {decliningBooking.customerName}
                </p>
                <p className="text-xs text-[#8898AA] mt-0.5">
                  {decliningBooking.serviceName ?? "No service specified"}
                </p>
              </div>

              <div>
                <Label className="text-sm text-[#425466]">
                  Reason (optional)
                </Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Fully booked for that date, outside service area..."
                  className="mt-1.5 border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineDialogOpen(false)}
              className="border-[#E3E8EE] text-[#425466]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1.5" />
              Decline Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  MapPin,
  AlertTriangle,
  CalendarIcon,
  Clock,
  Users,
  FileText,
  Send,
  ClipboardList,
  CircleDot,
  MessageSquare,
  StickyNote,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  getInitials,
  cn,
} from "@/lib/utils"
import { toast } from "sonner"
import { createVisit } from "@/actions/visits"
import { addJobNote } from "@/actions/jobs"
import { getActivityFeed } from "@/actions/activity"
import { computeJobFilterTab, type JobFilterTab } from "@/actions/jobs-v2"

// =============================================================================
// Types
// =============================================================================

interface TeamMemberRef {
  id: string
  firstName: string
  lastName: string
  avatar?: string | null
  color?: string | null
}

interface VisitAssignment {
  user: TeamMemberRef
}

interface VisitData {
  id: string
  visitNumber: number
  purpose: string
  status: string
  schedulingType: string
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  arrivalWindowMinutes: number | null
  onMyWaySentAt: string | null
  notes: string | null
  completionNotes: string | null
  assignments: VisitAssignment[]
}

interface QuoteData {
  id: string
  quoteNumber: string
  status: string
  total: number
  sentAt: string | null
  approvedAt?: string | null
}

interface InvoiceData {
  id: string
  invoiceNumber: string
  status: string
  total: number
  amountDue: number
  dueDate: string | null
  amountPaid?: number
}

interface LineItemData {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  total: number
  taxable: boolean
  visitId: string | null
}

interface PropertyData {
  id: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zip: string
}

interface CustomerData {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  properties: PropertyData[]
}

interface JobNoteData {
  id: string
  content: string
  createdAt: string
  user: {
    firstName: string
    lastName: string
    avatar: string | null
  }
}

interface JobAssignment {
  user: TeamMemberRef
}

interface ActivityEventData {
  id: string
  eventType: string
  title: string
  description: string | null
  metadata: any
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    avatar: string | null
  } | null
}

export interface JobV2Data {
  id: string
  jobNumber: string
  title: string
  description: string | null
  status: string
  priority: string
  isEmergency: boolean
  isRecurring: boolean
  scheduledStart: string | null
  scheduledEnd: string | null
  createdAt: string
  customer: CustomerData
  property: PropertyData | null
  visits: VisitData[]
  quote: QuoteData | null
  quotesInContext: QuoteData[]
  lineItems: LineItemData[]
  invoices: InvoiceData[]
  notes: JobNoteData[]
  assignments: JobAssignment[]
}

interface JobDetailV2Props {
  job: JobV2Data
  currentUserId: string
}

// =============================================================================
// Tab label mapping
// =============================================================================

const TAB_LABELS: Record<JobFilterTab, string> = {
  recurring: "Recurring",
  awaiting_approval: "Awaiting Approval",
  unscheduled: "Unscheduled",
  upcoming: "Upcoming",
  needs_invoicing: "Needs Invoicing",
  awaiting_payment: "Awaiting Payment",
  closed: "Closed",
}

const TAB_VARIANTS: Record<JobFilterTab, "default" | "success" | "warning" | "danger" | "info"> = {
  recurring: "info",
  awaiting_approval: "warning",
  unscheduled: "warning",
  upcoming: "default",
  needs_invoicing: "danger",
  awaiting_payment: "info",
  closed: "success",
}

// =============================================================================
// Helpers
// =============================================================================

function formatDurationMs(ms: number): string {
  const totalMins = Math.round(ms / (1000 * 60))
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    DIAGNOSTIC: "Diagnostic",
    SERVICE: "Service",
    FOLLOW_UP: "Follow-up",
    MAINTENANCE: "Maintenance",
  }
  return map[purpose] || purpose
}

function activityIcon(eventType: string) {
  if (eventType.includes("visit")) return <ClipboardList className="w-3.5 h-3.5" />
  if (eventType.includes("quote")) return <FileText className="w-3.5 h-3.5" />
  if (eventType.includes("invoice")) return <FileText className="w-3.5 h-3.5" />
  if (eventType.includes("note")) return <StickyNote className="w-3.5 h-3.5" />
  if (eventType.includes("status")) return <CircleDot className="w-3.5 h-3.5" />
  return <MessageSquare className="w-3.5 h-3.5" />
}

// =============================================================================
// Component
// =============================================================================

export function JobDetailV2({ job, currentUserId }: JobDetailV2Props) {
  const router = useRouter()

  // --- Notes state ---
  const [newNoteContent, setNewNoteContent] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [notes, setNotes] = useState(job.notes)

  // --- Visit creation state ---
  const [creatingVisit, setCreatingVisit] = useState(false)

  // --- Activity feed state ---
  const [activityEvents, setActivityEvents] = useState<ActivityEventData[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityCursor, setActivityCursor] = useState<string | null>(null)
  const [activityHasMore, setActivityHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // --- Compute filter tab ---
  const allQuotes = [
    ...(job.quote ? [{ status: job.quote.status }] : []),
    ...job.quotesInContext.map((q) => ({ status: q.status })),
  ]
  const filterTab = computeJobFilterTab({
    isRecurring: job.isRecurring,
    visits: job.visits.map((v) => ({ status: v.status, schedulingType: v.schedulingType })),
    quotesInContext: allQuotes,
    quote: job.quote ? { status: job.quote.status } : null,
    invoices: job.invoices.map((inv) => ({ status: inv.status, amountDue: inv.amountDue })),
  })

  // --- Load activity feed ---
  const loadActivity = useCallback(
    async (cursor?: string) => {
      try {
        const result = await getActivityFeed(job.id, { limit: 15, cursor })
        if ("error" in result) {
          console.error(result.error)
          return
        }
        const serialized = JSON.parse(JSON.stringify(result.events)) as ActivityEventData[]
        if (cursor) {
          setActivityEvents((prev) => [...prev, ...serialized])
        } else {
          setActivityEvents(serialized)
        }
        setActivityCursor(result.nextCursor ?? null)
        setActivityHasMore(result.hasMore ?? false)
      } catch (err) {
        console.error("Failed to load activity feed", err)
      } finally {
        setActivityLoading(false)
        setLoadingMore(false)
      }
    },
    [job.id]
  )

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  // --- Handlers ---

  async function handleAddVisit() {
    setCreatingVisit(true)
    try {
      const result = await createVisit({ jobId: job.id })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Visit created")
        router.refresh()
      }
    } catch {
      toast.error("Failed to create visit")
    } finally {
      setCreatingVisit(false)
    }
  }

  async function handleAddNote() {
    if (!newNoteContent.trim()) return
    setSavingNote(true)
    try {
      const result = await addJobNote(job.id, newNoteContent.trim())
      if ("error" in result) {
        toast.error(result.error)
      } else if (result.note) {
        setNotes((prev) => [
          {
            ...result.note,
            createdAt:
              result.note.createdAt instanceof Date
                ? result.note.createdAt.toISOString()
                : String(result.note.createdAt),
          } as JobNoteData,
          ...prev,
        ])
        setNewNoteContent("")
        toast.success("Note added")
      }
    } catch {
      toast.error("Failed to add note")
    } finally {
      setSavingNote(false)
    }
  }

  async function handleLoadMoreActivity() {
    if (!activityCursor) return
    setLoadingMore(true)
    await loadActivity(activityCursor)
  }

  // --- Combine quotes for display ---
  const displayQuotes: QuoteData[] = [
    ...(job.quote ? [job.quote] : []),
    ...job.quotesInContext,
  ]
  // Deduplicate by id (in case quote and quotesInContext overlap)
  const uniqueQuotes = displayQuotes.filter(
    (q, i, arr) => arr.findIndex((x) => x.id === q.id) === i
  )

  // --- Property address string ---
  const propertyAddress = job.property
    ? [
        job.property.addressLine1,
        job.property.addressLine2,
        `${job.property.city}, ${job.property.state} ${job.property.zip}`,
      ]
        .filter(Boolean)
        .join(", ")
    : null

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div>
      {/* ================================================================== */}
      {/* 1. Header                                                          */}
      {/* ================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 mt-1"
            aria-label="Go back"
          >
            <Link href="/jobs">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono text-[#8898AA]">
                {job.jobNumber}
              </span>
              {job.isEmergency && (
                <Badge
                  variant="destructive"
                  className="bg-red-600 text-white text-[10px] px-1.5 py-0"
                >
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                  Emergency
                </Badge>
              )}
              <StatusBadge
                status={TAB_LABELS[filterTab]}
                variant={TAB_VARIANTS[filterTab]}
              />
            </div>
            <h1 className="text-2xl font-semibold text-[#0A2540] mt-0.5">
              {job.title}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <Link
                href={`/customers/${job.customer.id}`}
                className="text-sm text-[#635BFF] hover:underline font-medium"
              >
                {job.customer.firstName} {job.customer.lastName}
              </Link>
              {propertyAddress && (
                <span className="flex items-center gap-1 text-xs text-[#8898AA]">
                  <MapPin className="w-3 h-3" />
                  {propertyAddress}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleAddVisit}
            disabled={creatingVisit}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {creatingVisit ? "Creating..." : "Add Visit"}
          </Button>
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-[#425466] whitespace-pre-wrap mb-6 ml-11">
          {job.description}
        </p>
      )}

      {/* ================================================================== */}
      {/* 2. Visits Timeline                                                  */}
      {/* ================================================================== */}
      <Card className="border-[#E3E8EE] mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#8898AA]" />
            Visits ({job.visits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {job.visits.length > 0 ? (
            <div className="relative">
              {/* Vertical timeline line */}
              {job.visits.length > 1 && (
                <div className="absolute left-[15px] top-6 bottom-6 w-px bg-[#E3E8EE]" />
              )}
              <div className="space-y-4">
                {job.visits.map((visit) => {
                  const isCompleted = visit.status === "COMPLETED"
                  const isCancelled = visit.status === "CANCELLED"
                  const isActive =
                    visit.status === "IN_PROGRESS" || visit.status === "EN_ROUTE"

                  // Duration calculation
                  let duration: string | null = null
                  if (
                    isCompleted &&
                    visit.actualStart &&
                    visit.actualEnd
                  ) {
                    const ms =
                      new Date(visit.actualEnd).getTime() -
                      new Date(visit.actualStart).getTime()
                    duration = formatDurationMs(ms)
                  }

                  return (
                    <div key={visit.id} className="flex gap-3 relative">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          "w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold",
                          isCompleted &&
                            "bg-green-100 text-green-700 border-2 border-green-300",
                          isCancelled &&
                            "bg-gray-100 text-gray-400 border-2 border-gray-300",
                          isActive &&
                            "bg-blue-100 text-blue-700 border-2 border-blue-300",
                          !isCompleted &&
                            !isCancelled &&
                            !isActive &&
                            "bg-[#F6F8FA] text-[#425466] border-2 border-[#E3E8EE]"
                        )}
                      >
                        {visit.visitNumber}
                      </div>

                      {/* Visit card */}
                      <div
                        className={cn(
                          "flex-1 border rounded-lg p-3",
                          isActive
                            ? "border-blue-200 bg-blue-50/30"
                            : "border-[#E3E8EE]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#0A2540]">
                              {job.jobNumber}_{String(visit.visitNumber).padStart(2, "0")}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-[#E3E8EE] text-[#8898AA]"
                            >
                              {purposeLabel(visit.purpose)}
                            </Badge>
                          </div>
                          <StatusBadge status={visit.status} />
                        </div>

                        {/* Schedule */}
                        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-[#8898AA]">
                          {visit.schedulingType === "UNSCHEDULED" ||
                          !visit.scheduledStart ? (
                            <span className="text-amber-600 font-medium">
                              Unscheduled
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {formatDate(visit.scheduledStart)}
                              {" "}
                              {formatTime(visit.scheduledStart)}
                              {visit.scheduledEnd && (
                                <> - {formatTime(visit.scheduledEnd)}</>
                              )}
                            </span>
                          )}

                          {duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {duration}
                            </span>
                          )}
                        </div>

                        {/* Assigned techs */}
                        {visit.assignments.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Users className="w-3 h-3 text-[#8898AA]" />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {visit.assignments.map((a) => (
                                <div
                                  key={a.user.id}
                                  className="flex items-center gap-1"
                                >
                                  <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{
                                      backgroundColor:
                                        a.user.color || "#635BFF",
                                    }}
                                  />
                                  <span className="text-xs text-[#425466]">
                                    {a.user.firstName} {a.user.lastName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Completion notes */}
                        {isCompleted && visit.completionNotes && (
                          <p className="text-xs text-[#425466] mt-2 italic bg-[#F6F8FA] rounded p-2">
                            {visit.completionNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8898AA] text-center py-6">
              No visits yet. Click &quot;Add Visit&quot; to create one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* 3. Quotes Section                                                   */}
      {/* ================================================================== */}
      {uniqueQuotes.length > 0 && (
        <Card className="border-[#E3E8EE] mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8898AA]" />
              Quotes ({uniqueQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uniqueQuotes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between border border-[#E3E8EE] rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/quotes/${q.id}`}
                      className="text-sm font-medium text-[#635BFF] hover:underline"
                    >
                      {q.quoteNumber}
                    </Link>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-[#0A2540]">
                      {formatCurrency(q.total)}
                    </span>
                    {q.sentAt && (
                      <span className="text-xs text-[#8898AA]">
                        Sent {formatDate(q.sentAt)}
                      </span>
                    )}
                    {q.approvedAt && (
                      <span className="text-xs text-green-600">
                        Approved {formatDate(q.approvedAt)}
                      </span>
                    )}
                    <Link href={`/quotes/${q.id}`}>
                      <ChevronRight className="w-4 h-4 text-[#8898AA]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* 4. Line Items                                                       */}
      {/* ================================================================== */}
      {job.lineItems.length > 0 && (
        <Card className="border-[#E3E8EE] mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              Line Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E3E8EE]">
                    <th className="text-left py-2 text-xs font-semibold uppercase text-[#8898AA]">
                      Item
                    </th>
                    <th className="text-left py-2 text-xs font-semibold uppercase text-[#8898AA]">
                      Visit
                    </th>
                    <th className="text-right py-2 text-xs font-semibold uppercase text-[#8898AA]">
                      Qty
                    </th>
                    <th className="text-right py-2 text-xs font-semibold uppercase text-[#8898AA]">
                      Unit Price
                    </th>
                    <th className="text-right py-2 text-xs font-semibold uppercase text-[#8898AA]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {job.lineItems.map((li) => {
                    // Find the visit this line item belongs to
                    const linkedVisit = li.visitId
                      ? job.visits.find((v) => v.id === li.visitId)
                      : null
                    return (
                      <tr
                        key={li.id}
                        className="border-b border-[#E3E8EE]"
                      >
                        <td className="py-2.5">
                          <p className="text-[#0A2540] font-medium">
                            {li.name}
                          </p>
                          {li.description && (
                            <p className="text-xs text-[#8898AA]">
                              {li.description}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-[#8898AA]">
                          {linkedVisit
                            ? `Visit #${linkedVisit.visitNumber}`
                            : "--"}
                        </td>
                        <td className="py-2.5 text-right text-[#425466]">
                          {li.quantity}
                        </td>
                        <td className="py-2.5 text-right text-[#425466]">
                          {formatCurrency(li.unitPrice)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-[#0A2540]">
                          {formatCurrency(li.total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={4}
                      className="text-right py-2.5 font-semibold text-[#0A2540]"
                    >
                      Subtotal
                    </td>
                    <td className="text-right py-2.5 font-semibold text-[#0A2540]">
                      {formatCurrency(
                        job.lineItems.reduce(
                          (sum, li) => sum + Number(li.total),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* 5. Invoices Section                                                 */}
      {/* ================================================================== */}
      {job.invoices.length > 0 && (
        <Card className="border-[#E3E8EE] mb-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8898AA]" />
              Invoices ({job.invoices.length})
            </CardTitle>
            <Button asChild size="sm" variant="outline" className="border-[#E3E8EE]">
              <Link href={`/invoices/new?jobId=${job.id}`}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Invoice
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {job.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between border border-[#E3E8EE] rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm font-medium text-[#635BFF] hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium text-[#0A2540]">
                        {formatCurrency(inv.total)}
                      </p>
                      {inv.amountDue > 0 && (
                        <p className="text-xs text-[#8898AA]">
                          Due: {formatCurrency(inv.amountDue)}
                        </p>
                      )}
                    </div>
                    {inv.dueDate && (
                      <span className="text-xs text-[#8898AA]">
                        Due {formatDate(inv.dueDate)}
                      </span>
                    )}
                    <Link href={`/invoices/${inv.id}`}>
                      <ChevronRight className="w-4 h-4 text-[#8898AA]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* 6. Activity Feed                                                    */}
      {/* ================================================================== */}
      <Card className="border-[#E3E8EE] mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#8898AA]" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#8898AA]" />
              <span className="text-sm text-[#8898AA] ml-2">
                Loading activity...
              </span>
            </div>
          ) : activityEvents.length > 0 ? (
            <div className="space-y-3">
              {activityEvents.map((event) => {
                const isInternalNote = event.eventType === "note_added"
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex gap-3 p-2 rounded-lg",
                      isInternalNote && "bg-amber-50/50"
                    )}
                  >
                    {/* Icon or avatar */}
                    <div className="flex-shrink-0 mt-0.5">
                      {event.user ? (
                        <Avatar className="h-7 w-7">
                          {event.user.avatar ? (
                            <AvatarImage src={event.user.avatar} />
                          ) : null}
                          <AvatarFallback className="text-[9px] bg-[#635BFF]/10 text-[#635BFF]">
                            {getInitials(
                              event.user.firstName,
                              event.user.lastName
                            )}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#F6F8FA] flex items-center justify-center text-[#8898AA]">
                          {activityIcon(event.eventType)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-[#0A2540] font-medium">
                          {event.title}
                        </p>
                        {isInternalNote && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-300 text-amber-700 bg-amber-50"
                          >
                            Internal
                          </Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-[#425466] mt-0.5">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8898AA]">
                        {event.user && (
                          <span>
                            {event.user.firstName} {event.user.lastName}
                          </span>
                        )}
                        <span>{formatRelativeTime(event.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {activityHasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMoreActivity}
                    disabled={loadingMore}
                    className="border-[#E3E8EE] text-[#425466]"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#8898AA] text-center py-6">
              No activity yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* 7. Notes Section                                                    */}
      {/* ================================================================== */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-[#8898AA]" />
            Internal Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add note form */}
          <div className="space-y-2">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add an internal note..."
              className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddNote}
                disabled={savingNote || !newNoteContent.trim()}
                size="sm"
                className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {savingNote ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>

          {notes.length > 0 && (
            <>
              <Separator className="bg-[#E3E8EE]" />
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      {note.user.avatar ? (
                        <AvatarImage src={note.user.avatar} />
                      ) : null}
                      <AvatarFallback className="text-[9px] bg-[#635BFF]/10 text-[#635BFF]">
                        {getInitials(note.user.firstName, note.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#0A2540]">
                          {note.user.firstName} {note.user.lastName}
                        </p>
                        <span className="text-xs text-[#8898AA]">
                          {formatRelativeTime(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[#425466] mt-0.5 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {notes.length === 0 && (
            <p className="text-sm text-[#8898AA] text-center py-4">
              No notes yet. Add the first note above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

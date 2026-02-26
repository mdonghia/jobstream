"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Square,
  Clock,
  MapPin,
  Navigation,
  Loader2,
  StickyNote,
  Wrench,
  User,
  Phone,
  Camera,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  getTechVisits,
  sendOnMyWayForVisit,
  updateVisitStatus,
  completeVisit,
} from "@/actions/visits"
import { toggleChecklistItem } from "@/actions/checklists"
import { uploadJobAttachment } from "@/actions/jobs"
import CompletionMenu from "@/components/visits/completion-menu"

// ---------------------------------------------------------------------------
// Types -- derived from getTechVisits return shape
// ---------------------------------------------------------------------------

type TechVisitsResult = Extract<
  Awaited<ReturnType<typeof getTechVisits>>,
  { visits: unknown }
>

type TechVisit = TechVisitsResult["visits"][number]

type VisitStatus = "UNSCHEDULED" | "ANYTIME" | "SCHEDULED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function formatTime(date: string | Date | null) {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function googleMapsUrl(property: {
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  zip: string
}) {
  const address = [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.state,
    property.zip,
  ]
    .filter(Boolean)
    .join(", ")
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/**
 * Compute the customer-facing arrival window string.
 * Given a scheduledStart and an arrivalWindowMinutes value,
 * returns something like "10:00 AM - 12:00 PM".
 */
function formatArrivalWindow(
  scheduledStart: string | Date | null,
  arrivalWindowMinutes: number | null | undefined
): string | null {
  if (!scheduledStart || !arrivalWindowMinutes || arrivalWindowMinutes <= 0) return null
  const start = new Date(scheduledStart)
  const end = new Date(start.getTime() + arrivalWindowMinutes * 60 * 1000)
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  return `${fmt(start)} - ${fmt(end)}`
}

function formatAddress(property: {
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  zip: string
}) {
  return [
    property.addressLine1,
    property.addressLine2,
    `${property.city}, ${property.state} ${property.zip}`,
  ]
    .filter(Boolean)
    .join(", ")
}

// ---------------------------------------------------------------------------
// VisitCard
// ---------------------------------------------------------------------------

function VisitCard({
  visit,
  isActive,
  onAction,
  actionLoading,
  onRefresh,
}: {
  visit: TechVisit
  isActive: boolean
  onAction: (visitId: string, action: "on_my_way" | "arrived" | "complete") => void
  actionLoading: string | null
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [techNotes, setTechNotes] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [checklistLoading, setChecklistLoading] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const status = visit.status as VisitStatus
  const isCompleted = status === "COMPLETED"
  const isEnRoute = status === "EN_ROUTE"
  const isInProgress = status === "IN_PROGRESS"
  const isScheduled = status === "SCHEDULED"
  const isLoading = actionLoading === visit.id

  // Expand automatically when card becomes in-progress
  useEffect(() => {
    if (isInProgress) setExpanded(true)
  }, [isInProgress])

  const customer = visit.job.customer
  const property = visit.job.property
  const customerName = `${customer.firstName} ${customer.lastName}`

  // Determine which action button to show
  let actionButton: React.ReactNode = null

  if (isScheduled) {
    actionButton = (
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => onAction(visit.id, "on_my_way")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
        On My Way
      </Button>
    )
  } else if (isEnRoute) {
    actionButton = (
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={() => onAction(visit.id, "arrived")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
        Arrived
      </Button>
    )
  } else if (isInProgress) {
    actionButton = (
      <Button
        size="sm"
        className="bg-purple-600 hover:bg-purple-700 text-white"
        onClick={() => onAction(visit.id, "complete")}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        Complete
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isCompleted && "opacity-60",
        !isActive && !isCompleted && !isEnRoute && !isInProgress && "opacity-50",
        (isActive || isEnRoute || isInProgress) && "ring-2 ring-primary/30 shadow-md"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row: customer name + action button */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isCompleted && (
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              )}
              <a
                href={`/jobs/${visit.job.id}`}
                className="font-semibold text-sm hover:underline truncate"
              >
                {customerName}
              </a>
              <Badge variant="secondary" className="text-xs">
                #{visit.job.jobNumber}
              </Badge>
            </div>

            {/* Purpose / title */}
            <p className="text-xs text-muted-foreground mt-0.5">
              {visit.purpose.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              {visit.job.title ? ` -- ${visit.job.title}` : ""}
            </p>
          </div>
          <div className="shrink-0">{actionButton}</div>
        </div>

        {/* Address */}
        {property && (
          <a
            href={googleMapsUrl(property)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            <MapPin className="size-3.5 mt-0.5 shrink-0" />
            <span>{formatAddress(property)}</span>
          </a>
        )}

        {/* Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          {visit.status === "ANYTIME" ? (
            <Badge variant="outline" className="text-xs py-0">Anytime</Badge>
          ) : visit.scheduledStart ? (
            <span>
              {formatTime(visit.scheduledStart)}
              {visit.scheduledEnd && ` - ${formatTime(visit.scheduledEnd)}`}
            </span>
          ) : (
            <span>Unscheduled</span>
          )}
        </div>

        {/* Arrival Window -- shown if arrivalWindowMinutes is set and > 0 */}
        {visit.arrivalWindowMinutes && visit.arrivalWindowMinutes > 0 && visit.scheduledStart && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0 text-amber-500" />
            <span>
              Arrival Window: {formatArrivalWindow(visit.scheduledStart, visit.arrivalWindowMinutes)}
            </span>
          </div>
        )}

        {/* Customer contact info */}
        {(customer.phone || customer.email) && (isEnRoute || isInProgress || isCompleted) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-foreground">
                <Phone className="size-3.5" />
                {customer.phone}
              </a>
            )}
          </div>
        )}

        {/* Expandable section for active / completed cards */}
        {(isInProgress || isCompleted || expanded) && (
          <div className="space-y-3 border-t pt-3">
            {/* Line items -- always visible on expanded card */}
            {visit.job.lineItems && visit.job.lineItems.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <Wrench className="size-3.5" />
                  Line Items
                </div>
                <ul className="space-y-1">
                  {visit.job.lineItems.map((item: any) => (
                    <li
                      key={item.id}
                      className="text-xs flex justify-between items-baseline gap-2"
                    >
                      <span className="truncate">
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground">
                            {" "}({item.quantity} x {formatCurrency(item.unitPrice)})
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatCurrency(item.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Office notes */}
            {visit.notes && (
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <StickyNote className="size-3.5" />
                  Office Notes
                </div>
                <p className="text-xs bg-muted/50 rounded p-2">{visit.notes}</p>
              </div>
            )}

            {/* Checklist -- shows job checklist items with toggle capability */}
            {visit.job.checklistItems && visit.job.checklistItems.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <CheckSquare className="size-3.5" />
                  Checklist
                </div>
                <ul className="space-y-1">
                  {visit.job.checklistItems.map((item: any) => {
                    const isToggling = checklistLoading === item.id
                    return (
                      <li key={item.id} className="flex items-start gap-2">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 disabled:opacity-50"
                          disabled={isToggling || isCompleted}
                          onClick={async () => {
                            setChecklistLoading(item.id)
                            try {
                              const result = await toggleChecklistItem(item.id, !item.isCompleted)
                              if (result.error) {
                                console.error("Checklist toggle error:", result.error)
                              } else {
                                // Refresh visit data to reflect the change
                                onRefresh()
                              }
                            } catch (err) {
                              console.error("Failed to toggle checklist item:", err)
                            } finally {
                              setChecklistLoading(null)
                            }
                          }}
                        >
                          {isToggling ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : item.isCompleted ? (
                            <CheckSquare className="size-4 text-emerald-500" />
                          ) : (
                            <Square className="size-4 text-muted-foreground" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "text-xs",
                            item.isCompleted && "line-through text-muted-foreground"
                          )}
                        >
                          {item.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Photo capture section */}
            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                <Camera className="size-3.5" />
                Photos
              </div>

              {/* Thumbnail grid of existing photos */}
              {visit.job.attachments && visit.job.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(visit.job.attachments as any[])
                    .filter((att: any) => att.fileType?.startsWith("image/"))
                    .map((att: any) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group block w-16 h-16 rounded border overflow-hidden bg-muted/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                </div>
              )}

              {/* Upload button -- only when visit is in progress */}
              {isInProgress && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setPhotoUploading(true)
                      try {
                        const formData = new FormData()
                        formData.append("file", file)
                        const result = await uploadJobAttachment(visit.job.id, formData)
                        if ("error" in result && result.error) {
                          console.error("Photo upload error:", result.error)
                        } else {
                          // Refresh to show new photo
                          onRefresh()
                        }
                      } catch (err) {
                        console.error("Photo upload failed:", err)
                      } finally {
                        setPhotoUploading(false)
                        // Reset file input so same file can be re-selected
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={photoUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoUploading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Camera className="size-3.5" />
                    )}
                    {photoUploading ? "Uploading..." : "Add Photo"}
                  </Button>
                </>
              )}

              {/* Show message when no photos and not in progress */}
              {(!visit.job.attachments ||
                (visit.job.attachments as any[]).filter((a: any) => a.fileType?.startsWith("image/")).length === 0) &&
                !isInProgress && (
                <p className="text-xs text-muted-foreground italic">No photos</p>
              )}
            </div>

            {/* Tech notes field (editable when in progress) */}
            {isInProgress && (
              <div className="space-y-1">
                <Label htmlFor={`tech-notes-${visit.id}`} className="text-xs">
                  <User className="size-3.5 inline mr-1" />
                  Tech Notes
                </Label>
                <Textarea
                  id={`tech-notes-${visit.id}`}
                  placeholder="Add notes about the visit..."
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            )}

            {/* Completion notes field (editable when in progress) */}
            {isInProgress && (
              <div className="space-y-1">
                <Label htmlFor={`completion-notes-${visit.id}`} className="text-xs">
                  Completion Notes
                </Label>
                <Textarea
                  id={`completion-notes-${visit.id}`}
                  placeholder="Notes for the customer or office..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            )}

            {/* Completion notes display (when completed) */}
            {isCompleted && visit.completionNotes && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Completion Notes
                </div>
                <p className="text-xs bg-muted/50 rounded p-2">
                  {visit.completionNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Expand toggle for completed cards */}
        {isCompleted && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronDown className="size-3.5" />
            Show details
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// TechPipeline (main component)
// ---------------------------------------------------------------------------

export default function TechPipeline() {
  const router = useRouter()
  const [showTomorrow, setShowTomorrow] = useState(false)
  const [visits, setVisits] = useState<TechVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [completionMenuVisit, setCompletionMenuVisit] = useState<TechVisit | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch visits for the selected day
  const fetchVisits = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTechVisits({
        date: todayISO(),
        tomorrow: showTomorrow,
      })
      if ("visits" in result && result.visits) {
        setVisits(result.visits as TechVisit[])
      }
    } catch (err) {
      console.error("Failed to fetch visits:", err)
    } finally {
      setLoading(false)
    }
  }, [showTomorrow])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  // Handle action button clicks
  function handleAction(visitId: string, action: "on_my_way" | "arrived" | "complete") {
    setActionLoading(visitId)
    startTransition(async () => {
      try {
        let result: { error?: string; success?: boolean }

        if (action === "on_my_way") {
          result = await sendOnMyWayForVisit(visitId)
        } else if (action === "arrived") {
          result = await updateVisitStatus(visitId, "IN_PROGRESS")
        } else {
          // complete
          result = await completeVisit(visitId)
        }

        if (result.error) {
          console.error("Visit action error:", result.error)
        } else {
          // Re-fetch visits to get updated state
          const refreshResult = await getTechVisits({
            date: todayISO(),
            tomorrow: showTomorrow,
          })
          if ("visits" in refreshResult && refreshResult.visits) {
            setVisits(refreshResult.visits as TechVisit[])
          }

          // If completing, show the completion menu
          if (action === "complete") {
            const completedVisit = visits.find((v) => v.id === visitId)
            if (completedVisit) {
              setCompletionMenuVisit(completedVisit)
            }
          }
        }
      } catch (err) {
        console.error("Visit action failed:", err)
      } finally {
        setActionLoading(null)
      }
    })
  }

  // Split visits into active (non-completed) and completed
  const activeVisits = visits.filter((v) => v.status !== "COMPLETED")
  const completedVisits = visits.filter((v) => v.status === "COMPLETED")

  // Determine which visit is currently "active" (first non-completed, non-scheduled
  // that is en-route or in-progress, or just the first non-completed)
  const currentActive = activeVisits.find(
    (v) => v.status === "IN_PROGRESS" || v.status === "EN_ROUTE"
  ) || activeVisits[0]

  // Format the date for display
  const displayDate = new Date()
  if (showTomorrow) displayDate.setDate(displayDate.getDate() + 1)
  const dateLabel = displayDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-[#F6F8FA] border-b pb-3 pt-4 px-4 mb-4">
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={() => setShowTomorrow(false)}
            className={cn(
              "text-lg font-bold transition-colors",
              !showTomorrow ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setShowTomorrow(true)}
            className={cn(
              "text-lg font-bold transition-colors",
              showTomorrow ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Tomorrow
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && visits.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="text-muted-foreground text-sm">
            No visits {showTomorrow ? "tomorrow" : "today"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Visits assigned to you will appear here
          </p>
        </div>
      )}

      {/* Active / upcoming visits */}
      {!loading && activeVisits.length > 0 && (
        <div className="px-4 space-y-1">
          {activeVisits.map((visit, index) => (
            <div key={visit.id}>
              <VisitCard
                visit={visit}
                isActive={currentActive?.id === visit.id}
                onAction={handleAction}
                actionLoading={actionLoading}
                onRefresh={fetchVisits}
              />
              {/* Connector arrow between cards */}
              {index < activeVisits.length - 1 && (
                <div className="flex justify-center py-1">
                  <ChevronDown className="size-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed visits section */}
      {!loading && completedVisits.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              Completed ({completedVisits.length})
            </h3>
          </div>
          <div className="space-y-2">
            {completedVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                isActive={false}
                onAction={handleAction}
                actionLoading={actionLoading}
                onRefresh={fetchVisits}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completion Menu Dialog */}
      {completionMenuVisit && (
        <CompletionMenu
          visitId={completionMenuVisit.id}
          jobId={completionMenuVisit.job.id}
          customerId={completionMenuVisit.job.customer.id}
          jobNumber={String(completionMenuVisit.job.jobNumber)}
          onClose={() => {
            setCompletionMenuVisit(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

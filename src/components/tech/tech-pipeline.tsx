"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Loader2,
  StickyNote,
  Wrench,
  User,
  Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
import CompletionMenu from "@/components/visits/completion-menu"

// ---------------------------------------------------------------------------
// Types -- derived from getTechVisits return shape
// ---------------------------------------------------------------------------

type TechVisitsResult = Extract<
  Awaited<ReturnType<typeof getTechVisits>>,
  { visits: unknown }
>

type TechVisit = TechVisitsResult["visits"][number]

type VisitStatus = "SCHEDULED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

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
}: {
  visit: TechVisit
  isActive: boolean
  onAction: (visitId: string, action: "on_my_way" | "arrived" | "complete") => void
  actionLoading: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [techNotes, setTechNotes] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")

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
          {visit.schedulingType === "ANYTIME" ? (
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
            {/* Line items */}
            {visit.job.lineItems && visit.job.lineItems.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <Wrench className="size-3.5" />
                  Work Items
                </div>
                <ul className="space-y-1">
                  {visit.job.lineItems.map((item: any) => (
                    <li
                      key={item.id}
                      className="text-xs flex justify-between items-baseline"
                    >
                      <span>
                        {item.name}
                        {item.quantity > 1 && ` x${item.quantity}`}
                      </span>
                      <span className="text-muted-foreground">
                        ${item.total.toFixed(2)}
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

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  ChevronDown,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { createVisit, rescheduleVisit, assignVisit, updateVisitStatus, completeVisit, unscheduleVisit, updateVisitPurpose, updateVisitNotes } from "@/actions/visits"
import { addJobNote, updateJob, addJobLineItem, updateJobLineItem, deleteJobLineItem } from "@/actions/jobs"
import { getActivityFeed } from "@/actions/activity"
import { computeJobFilterTab, type JobFilterTab } from "@/lib/job-filter-tab"
import { useAutoSave } from "@/hooks/use-auto-save"
import { AutoSaveIndicator } from "@/components/shared/auto-save-indicator"

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

interface TeamMemberWithRole extends TeamMemberRef {
  role?: string
}

interface JobDetailV2Props {
  job: JobV2Data
  currentUserId: string
  teamMembers: TeamMemberWithRole[]
}

// =============================================================================
// Tab label mapping
// =============================================================================

const TAB_LABELS: Record<JobFilterTab, string> = {
  unscheduled: "Unscheduled",
  scheduled: "Scheduled",
  quoted: "Quoted",
  needs_invoicing: "Needs Invoicing",
  awaiting_payment: "Awaiting Payment",
  closed: "Closed",
}

const TAB_VARIANTS: Record<JobFilterTab, "default" | "success" | "warning" | "danger" | "info"> = {
  unscheduled: "warning",
  scheduled: "default",
  quoted: "warning",
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

export function JobDetailV2({ job, currentUserId, teamMembers }: JobDetailV2Props) {
  const router = useRouter()

  // --- Notes state ---
  const [newNoteContent, setNewNoteContent] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [notes, setNotes] = useState(job.notes)

  // --- Edit Job dialog state ---
  const [showEditJobDialog, setShowEditJobDialog] = useState(false)
  const [editTitle, setEditTitle] = useState(job.title)
  const [editDescription, setEditDescription] = useState(job.description || "")
  const [editIsEmergency, setEditIsEmergency] = useState(job.isEmergency)
  const [savingJob, setSavingJob] = useState(false)

  // --- Visit creation state ---
  const [creatingVisit, setCreatingVisit] = useState(false)
  const [showAddVisitDialog, setShowAddVisitDialog] = useState(false)
  const [visitPurpose, setVisitPurpose] = useState<"DIAGNOSTIC" | "SERVICE" | "FOLLOW_UP" | "MAINTENANCE">("SERVICE")
  const [visitInitialStatus, setVisitInitialStatus] = useState<"SCHEDULED" | "ANYTIME" | "UNSCHEDULED">("UNSCHEDULED")
  const [visitScheduledStart, setVisitScheduledStart] = useState("")
  const [visitScheduledEnd, setVisitScheduledEnd] = useState("")
  const [visitNotes, setVisitNotes] = useState("")
  const [visitAssignedUserIds, setVisitAssignedUserIds] = useState<string[]>([])

  // --- Visit expand / inline edit state ---
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null)
  const [visitActionLoading, setVisitActionLoading] = useState<string | null>(null)
  // Per-visit schedule edit state
  const [editScheduleVisitId, setEditScheduleVisitId] = useState<string | null>(null)
  const [editSchedDate, setEditSchedDate] = useState("")
  const [editSchedStartTime, setEditSchedStartTime] = useState("")
  const [editSchedEndTime, setEditSchedEndTime] = useState("")
  const [editSchedAnytime, setEditSchedAnytime] = useState(false)
  // Per-visit purpose edit state
  const [editPurposeVisitId, setEditPurposeVisitId] = useState<string | null>(null)
  // Per-visit notes edit state
  const [editNotesVisitId, setEditNotesVisitId] = useState<string | null>(null)
  const [editNotesValue, setEditNotesValue] = useState("")
  // Per-visit tech assignment state
  const [editAssignVisitId, setEditAssignVisitId] = useState<string | null>(null)
  const [editAssignUserIds, setEditAssignUserIds] = useState<string[]>([])
  // Completion notes state
  const [completionNotesVisitId, setCompletionNotesVisitId] = useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = useState("")

  // --- Line item CRUD state ---
  const [showAddLineItem, setShowAddLineItem] = useState(false)
  const [newLIName, setNewLIName] = useState("")
  const [newLIDescription, setNewLIDescription] = useState("")
  const [newLIQty, setNewLIQty] = useState("1")
  const [newLIPrice, setNewLIPrice] = useState("")
  const [newLITaxable, setNewLITaxable] = useState(true)
  const [savingLineItem, setSavingLineItem] = useState(false)
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null)
  const [editLIName, setEditLIName] = useState("")
  const [editLIQty, setEditLIQty] = useState("")
  const [editLIPrice, setEditLIPrice] = useState("")
  const [deletingLineItemId, setDeletingLineItemId] = useState<string | null>(null)

  // --- Edit Job auto-save ---
  const editJobAutoSaveData = useMemo(
    () => ({ title: editTitle, description: editDescription, isEmergency: editIsEmergency }),
    [editTitle, editDescription, editIsEmergency]
  )

  const handleEditJobAutoSave = useCallback(
    async (data: { title: string; description: string; isEmergency: boolean }) => {
      if (!data.title.trim()) return
      const result = await updateJob(job.id, {
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        isEmergency: data.isEmergency,
      })
      if ("error" in result) {
        throw new Error(result.error)
      }
    },
    [job.id]
  )

  const { status: editJobAutoSaveStatus } = useAutoSave({
    data: editJobAutoSaveData,
    onSave: handleEditJobAutoSave,
    enabled: showEditJobDialog,
    debounceMs: 1500,
  })

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
    visits: job.visits.map((v) => ({ status: v.status })),
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

  async function handleEditJob() {
    if (!editTitle.trim()) {
      toast.error("Title is required")
      return
    }
    setSavingJob(true)
    try {
      const result = await updateJob(job.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        isEmergency: editIsEmergency,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Job updated")
        setShowEditJobDialog(false)
        router.refresh()
      }
    } catch {
      toast.error("Failed to update job")
    } finally {
      setSavingJob(false)
    }
  }

  async function handleAddVisit() {
    setCreatingVisit(true)
    try {
      const result = await createVisit({
        jobId: job.id,
        purpose: visitPurpose,
        status: visitInitialStatus,
        scheduledStart: visitInitialStatus === "SCHEDULED" && visitScheduledStart ? visitScheduledStart : undefined,
        scheduledEnd: visitInitialStatus === "SCHEDULED" && visitScheduledEnd ? visitScheduledEnd : undefined,
        notes: visitNotes.trim() || undefined,
        assignedUserIds: visitAssignedUserIds.length > 0 ? visitAssignedUserIds : undefined,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Visit created")
        setShowAddVisitDialog(false)
        // Reset form
        setVisitPurpose("SERVICE")
        setVisitInitialStatus("UNSCHEDULED")
        setVisitScheduledStart("")
        setVisitScheduledEnd("")
        setVisitNotes("")
        setVisitAssignedUserIds([])
        router.refresh()
      }
    } catch {
      toast.error("Failed to create visit")
    } finally {
      setCreatingVisit(false)
    }
  }

  // --- Visit action handlers ---

  async function handleVisitStatusChange(visitId: string, newStatus: "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
    if (newStatus === "COMPLETED" && !completionNotesVisitId) {
      // Show completion notes prompt first
      setCompletionNotesVisitId(visitId)
      return
    }
    setVisitActionLoading(visitId)
    try {
      const result = newStatus === "COMPLETED"
        ? await completeVisit(visitId, { completionNotes: completionNotes.trim() || undefined })
        : await updateVisitStatus(visitId, newStatus)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(`Visit ${newStatus === "IN_PROGRESS" ? "marked arrived" : newStatus === "COMPLETED" ? "completed" : newStatus.toLowerCase()}`)
        setCompletionNotesVisitId(null)
        setCompletionNotes("")
        router.refresh()
      }
    } catch {
      toast.error("Failed to update visit status")
    } finally {
      setVisitActionLoading(null)
    }
  }

  async function handleRescheduleVisit(visitId: string) {
    if (!editSchedDate) {
      toast.error("Date is required")
      return
    }
    if (!editSchedAnytime && (!editSchedStartTime || !editSchedEndTime)) {
      toast.error("Start and end time required")
      return
    }
    setVisitActionLoading(visitId)
    try {
      const startDateTime = editSchedAnytime
        ? `${editSchedDate}T00:00`
        : `${editSchedDate}T${editSchedStartTime}`
      const endDateTime = editSchedAnytime
        ? null
        : `${editSchedDate}T${editSchedEndTime}`
      const result = await rescheduleVisit(visitId, startDateTime, endDateTime, { anytime: editSchedAnytime })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(editSchedAnytime ? "Visit set to anytime" : "Visit scheduled")
        setEditScheduleVisitId(null)
        setEditSchedDate("")
        setEditSchedStartTime("")
        setEditSchedEndTime("")
        setEditSchedAnytime(false)
        router.refresh()
      }
    } catch {
      toast.error("Failed to schedule visit")
    } finally {
      setVisitActionLoading(null)
    }
  }

  async function handleUnscheduleVisit(visitId: string) {
    setVisitActionLoading(visitId)
    try {
      const result = await unscheduleVisit(visitId)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Schedule removed")
        setEditScheduleVisitId(null)
        router.refresh()
      }
    } catch {
      toast.error("Failed to remove schedule")
    } finally {
      setVisitActionLoading(null)
    }
  }

  async function handleUpdateVisitPurpose(visitId: string, purpose: "DIAGNOSTIC" | "SERVICE" | "FOLLOW_UP" | "MAINTENANCE") {
    setVisitActionLoading(visitId)
    try {
      const result = await updateVisitPurpose(visitId, purpose)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setEditPurposeVisitId(null)
        router.refresh()
      }
    } catch {
      toast.error("Failed to update visit type")
    } finally {
      setVisitActionLoading(null)
    }
  }

  async function handleUpdateVisitNotes(visitId: string) {
    setVisitActionLoading(visitId)
    try {
      const result = await updateVisitNotes(visitId, editNotesValue)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Notes updated")
        setEditNotesVisitId(null)
        setEditNotesValue("")
        router.refresh()
      }
    } catch {
      toast.error("Failed to update notes")
    } finally {
      setVisitActionLoading(null)
    }
  }

  async function handleAssignVisit(visitId: string) {
    setVisitActionLoading(visitId)
    try {
      const result = await assignVisit(visitId, editAssignUserIds)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Team updated")
        setEditAssignVisitId(null)
        setEditAssignUserIds([])
        router.refresh()
      }
    } catch {
      toast.error("Failed to assign visit")
    } finally {
      setVisitActionLoading(null)
    }
  }

  // --- Line item handlers ---

  async function handleAddLineItem() {
    if (!newLIName.trim() || !newLIPrice) return
    setSavingLineItem(true)
    try {
      const result = await addJobLineItem(job.id, {
        name: newLIName.trim(),
        description: newLIDescription.trim() || undefined,
        quantity: Number(newLIQty) || 1,
        unitPrice: Number(newLIPrice) || 0,
        taxable: newLITaxable,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Line item added")
        setShowAddLineItem(false)
        setNewLIName("")
        setNewLIDescription("")
        setNewLIQty("1")
        setNewLIPrice("")
        setNewLITaxable(true)
        router.refresh()
      }
    } catch {
      toast.error("Failed to add line item")
    } finally {
      setSavingLineItem(false)
    }
  }

  async function handleUpdateLineItem(itemId: string) {
    setSavingLineItem(true)
    try {
      const result = await updateJobLineItem(itemId, {
        name: editLIName.trim() || undefined,
        quantity: Number(editLIQty) || undefined,
        unitPrice: Number(editLIPrice) || undefined,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Line item updated")
        setEditingLineItemId(null)
        router.refresh()
      }
    } catch {
      toast.error("Failed to update line item")
    } finally {
      setSavingLineItem(false)
    }
  }

  async function handleDeleteLineItem(itemId: string) {
    setDeletingLineItemId(itemId)
    try {
      const result = await deleteJobLineItem(itemId)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Line item removed")
        router.refresh()
      }
    } catch {
      toast.error("Failed to remove line item")
    } finally {
      setDeletingLineItemId(null)
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
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#8898AA] hover:text-[#635BFF] hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  {propertyAddress}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setEditTitle(job.title)
              setEditDescription(job.description || "")
              setEditIsEmergency(job.isEmergency)
              setShowEditJobDialog(true)
            }}
            className="border-[#E3E8EE]"
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            Edit Job
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Edit Job Dialog                                                     */}
      {/* ================================================================== */}
      <Dialog open={showEditJobDialog} onOpenChange={setShowEditJobDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>Edit Job</DialogTitle>
              <AutoSaveIndicator status={editJobAutoSaveStatus} />
            </div>
            <DialogDescription>
              Update the job title, description, and emergency status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-job-title">Title</Label>
              <Input
                id="edit-job-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Job title"
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-job-description">Description</Label>
              <Textarea
                id="edit-job-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Job description (optional)"
                className="min-h-[100px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-job-emergency">Emergency</Label>
                <p className="text-xs text-[#8898AA]">
                  Mark this job as an emergency
                </p>
              </div>
              <Switch
                id="edit-job-emergency"
                checked={editIsEmergency}
                onCheckedChange={setEditIsEmergency}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditJobDialog(false)}
              className="border-[#E3E8EE]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditJob}
              disabled={savingJob || !editTitle.trim()}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {savingJob ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Add Visit Dialog                                                    */}
      {/* ================================================================== */}
      <Dialog open={showAddVisitDialog} onOpenChange={setShowAddVisitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Visit</DialogTitle>
            <DialogDescription>
              Create a new visit for this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select
                value={visitPurpose}
                onValueChange={(v) => setVisitPurpose(v as typeof visitPurpose)}
              >
                <SelectTrigger className="w-full border-[#E3E8EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={visitInitialStatus}
                onValueChange={(v) => setVisitInitialStatus(v as typeof visitInitialStatus)}
              >
                <SelectTrigger className="w-full border-[#E3E8EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="ANYTIME">Anytime</SelectItem>
                  <SelectItem value="UNSCHEDULED">Unscheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {visitInitialStatus === "SCHEDULED" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="visit-start">Schedule Start</Label>
                  <Input
                    id="visit-start"
                    type="datetime-local"
                    value={visitScheduledStart}
                    onChange={(e) => setVisitScheduledStart(e.target.value)}
                    className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-end">Schedule End</Label>
                  <Input
                    id="visit-end"
                    type="datetime-local"
                    value={visitScheduledEnd}
                    onChange={(e) => setVisitScheduledEnd(e.target.value)}
                    className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  />
                </div>
              </>
            )}
            {/* Tech assignment for new visit */}
            <div className="space-y-2">
              <Label>Assign Team</Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border border-[#E3E8EE] rounded-md p-2">
                {teamMembers.map((tm) => {
                  const isSelected = visitAssignedUserIds.includes(tm.id)
                  return (
                    <label
                      key={tm.id}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded cursor-pointer text-sm",
                        isSelected ? "bg-[#635BFF]/10" : "hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setVisitAssignedUserIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== tm.id)
                              : [...prev, tm.id]
                          )
                        }}
                        className="rounded border-gray-300 text-[#635BFF] focus:ring-[#635BFF]"
                      />
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tm.color || "#635BFF" }}
                      />
                      <span className="text-[#425466]">
                        {tm.firstName} {tm.lastName}
                      </span>
                    </label>
                  )
                })}
                {teamMembers.length === 0 && (
                  <p className="text-xs text-[#8898AA] text-center py-2">No team members found</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit-notes">Visit Notes</Label>
              <Textarea
                id="visit-notes"
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Optional notes for this visit"
                className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddVisitDialog(false)}
              className="border-[#E3E8EE]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddVisit}
              disabled={creatingVisit}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {creatingVisit ? "Creating..." : "Create Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#8898AA]" />
            Visits ({job.visits.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAddVisitDialog(true)}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Visit
          </Button>
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
                  const isExpanded = expandedVisitId === visit.id
                  const isLoading = visitActionLoading === visit.id

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

                      {/* Visit card -- clickable to expand */}
                      <div
                        className={cn(
                          "flex-1 border rounded-lg transition-all",
                          isActive
                            ? "border-blue-200 bg-blue-50/30"
                            : "border-[#E3E8EE]",
                          !isCompleted && !isCancelled && "cursor-pointer hover:border-[#635BFF]/40 hover:shadow-sm"
                        )}
                      >
                        {/* Card header -- always visible */}
                        <div
                          className="p-3"
                          onClick={() => {
                            if (!isCompleted && !isCancelled) {
                              setExpandedVisitId(isExpanded ? null : visit.id)
                            }
                          }}
                        >
                          {/* Top row: visit ID, purpose, status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#0A2540]">
                                {job.jobNumber}_{String(visit.visitNumber).padStart(2, "0")}
                              </span>
                              {/* Purpose badge - clickable when expanded */}
                              {isExpanded && !isCompleted && !isCancelled ? (
                                editPurposeVisitId === visit.id ? (
                                  <Select
                                    value={visit.purpose}
                                    onValueChange={(v) => handleUpdateVisitPurpose(visit.id, v as any)}
                                  >
                                    <SelectTrigger className="h-6 w-auto text-[10px] border-[#E3E8EE] px-2" onClick={(e) => e.stopPropagation()}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                                      <SelectItem value="SERVICE">Service</SelectItem>
                                      <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-[#E3E8EE] text-[#8898AA] cursor-pointer hover:border-[#635BFF] hover:text-[#635BFF] transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditPurposeVisitId(visit.id)
                                    }}
                                  >
                                    {purposeLabel(visit.purpose)}
                                  </Badge>
                                )
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-[#E3E8EE] text-[#8898AA]"
                                >
                                  {purposeLabel(visit.purpose)}
                                </Badge>
                              )}
                              {!isCompleted && !isCancelled && (
                                <span className="text-[#8898AA]">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                            <StatusBadge status={visit.status} />
                          </div>

                          {/* Bottom row: schedule + assigned techs in one line */}
                          <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-[#8898AA]">
                            {visit.status === "UNSCHEDULED" ? (
                              <span className="text-amber-600 font-medium">Unscheduled</span>
                            ) : visit.status === "ANYTIME" && visit.scheduledStart ? (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {formatDate(visit.scheduledStart)} (Anytime)
                              </span>
                            ) : visit.scheduledStart ? (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {formatDate(visit.scheduledStart)}
                                {" "}
                                {formatTime(visit.scheduledStart)}
                                {visit.scheduledEnd && (
                                  <> - {formatTime(visit.scheduledEnd)}</>
                                )}
                              </span>
                            ) : null}

                            {duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {duration}
                              </span>
                            )}

                            {visit.assignments.length > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3 h-3" />
                                {visit.assignments.map((a) => (
                                  <span key={a.user.id} className="flex items-center gap-0.5">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full inline-block"
                                      style={{ backgroundColor: a.user.color || "#635BFF" }}
                                    />
                                    <span className="text-[#425466]">{a.user.firstName}</span>
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>

                          {/* Completion notes */}
                          {isCompleted && visit.completionNotes && (
                            <p className="text-xs text-[#425466] mt-2 italic bg-[#F6F8FA] rounded p-2">
                              {visit.completionNotes}
                            </p>
                          )}
                        </div>

                        {/* ========================================== */}
                        {/* Expanded panel -- inline actions           */}
                        {/* ========================================== */}
                        {isExpanded && !isCompleted && !isCancelled && (
                          <div className="border-t border-[#E3E8EE] px-3 pb-3 pt-2 space-y-3">
                            {/* --- Status transition buttons (no On My Way) --- */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {visit.status === "EN_ROUTE" && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleVisitStatusChange(visit.id, "IN_PROGRESS") }}
                                  disabled={isLoading}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                  Arrived
                                </Button>
                              )}
                              {visit.status === "IN_PROGRESS" && (
                                <>
                                  {completionNotesVisitId === visit.id ? (
                                    <div className="flex-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                                      <Textarea
                                        value={completionNotes}
                                        onChange={(e) => setCompletionNotes(e.target.value)}
                                        placeholder="Completion notes (optional)"
                                        className="min-h-[60px] text-xs border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setVisitActionLoading(visit.id)
                                            completeVisit(visit.id, { completionNotes: completionNotes.trim() || undefined })
                                              .then((result) => {
                                                if ("error" in result) {
                                                  toast.error(result.error)
                                                } else {
                                                  toast.success("Visit completed")
                                                  setCompletionNotesVisitId(null)
                                                  setCompletionNotes("")
                                                  router.refresh()
                                                }
                                              })
                                              .catch(() => toast.error("Failed to complete visit"))
                                              .finally(() => setVisitActionLoading(null))
                                          }}
                                          disabled={isLoading}
                                          className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                        >
                                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                          Complete
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => { setCompletionNotesVisitId(null); setCompletionNotes("") }}
                                          className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleVisitStatusChange(visit.id, "COMPLETED") }}
                                      disabled={isLoading}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Complete Visit
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* --- Action buttons row --- */}
                            <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {editScheduleVisitId !== visit.id && editAssignVisitId !== visit.id && editNotesVisitId !== visit.id && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditScheduleVisitId(visit.id)
                                      // Smart defaults
                                      if (visit.scheduledStart) {
                                        const d = new Date(visit.scheduledStart)
                                        setEditSchedDate(d.toISOString().slice(0, 10))
                                        setEditSchedStartTime(d.toTimeString().slice(0, 5))
                                        if (visit.scheduledEnd) {
                                          const e = new Date(visit.scheduledEnd)
                                          setEditSchedEndTime(e.toTimeString().slice(0, 5))
                                        } else {
                                          const end = new Date(d.getTime() + 60 * 60 * 1000)
                                          setEditSchedEndTime(end.toTimeString().slice(0, 5))
                                        }
                                        setEditSchedAnytime(visit.status === "ANYTIME")
                                      } else {
                                        // Default to today, next round hour
                                        const now = new Date()
                                        setEditSchedDate(now.toISOString().slice(0, 10))
                                        const nextHour = new Date(now)
                                        nextHour.setMinutes(0, 0, 0)
                                        nextHour.setHours(nextHour.getHours() + 1)
                                        setEditSchedStartTime(nextHour.toTimeString().slice(0, 5))
                                        const endTime = new Date(nextHour.getTime() + 60 * 60 * 1000)
                                        setEditSchedEndTime(endTime.toTimeString().slice(0, 5))
                                        setEditSchedAnytime(false)
                                      }
                                    }}
                                    className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                  >
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    {visit.status === "SCHEDULED" || visit.status === "ANYTIME" ? "Reschedule" : "Schedule"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditAssignVisitId(visit.id)
                                      setEditAssignUserIds(visit.assignments.map((a) => a.user.id))
                                    }}
                                    className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    {visit.assignments.length > 0 ? "Change Team" : "Assign Team"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditNotesVisitId(visit.id)
                                      setEditNotesValue(visit.notes || "")
                                    }}
                                    className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                  >
                                    <StickyNote className="w-3 h-3 mr-1" />
                                    {visit.notes ? "Edit Notes" : "Add Notes"}
                                  </Button>
                                </>
                              )}
                            </div>

                            {/* --- Schedule inline editor --- */}
                            {editScheduleVisitId === visit.id && (
                              <div className="space-y-2.5 bg-[#F6F8FA] rounded-lg p-3" onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-medium text-[#0A2540]">
                                  {visit.status === "SCHEDULED" || visit.status === "ANYTIME" ? "Reschedule" : "Schedule"} Visit
                                </p>

                                {/* Any time checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editSchedAnytime}
                                    onChange={(e) => setEditSchedAnytime(e.target.checked)}
                                    className="rounded border-gray-300 text-[#635BFF] focus:ring-[#635BFF]"
                                  />
                                  <span className="text-xs text-[#425466]">Any time (just pick the day)</span>
                                </label>

                                {/* Date */}
                                <div>
                                  <Label className="text-[10px] text-[#8898AA]">Date</Label>
                                  <Input
                                    type="date"
                                    value={editSchedDate}
                                    onChange={(e) => setEditSchedDate(e.target.value)}
                                    className="h-8 text-xs border-[#E3E8EE]"
                                  />
                                </div>

                                {/* Time inputs (hidden when anytime) */}
                                {!editSchedAnytime && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] text-[#8898AA]">Start Time</Label>
                                      <Input
                                        type="time"
                                        value={editSchedStartTime}
                                        onChange={(e) => {
                                          setEditSchedStartTime(e.target.value)
                                          // Auto-adjust end time to 1 hour after
                                          if (e.target.value) {
                                            const [h, m] = e.target.value.split(":").map(Number)
                                            const end = new Date(2000, 0, 1, h + 1, m)
                                            setEditSchedEndTime(end.toTimeString().slice(0, 5))
                                          }
                                        }}
                                        className="h-8 text-xs border-[#E3E8EE]"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-[#8898AA]">End Time</Label>
                                      <Input
                                        type="time"
                                        value={editSchedEndTime}
                                        onChange={(e) => setEditSchedEndTime(e.target.value)}
                                        className="h-8 text-xs border-[#E3E8EE]"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Buttons */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleRescheduleVisit(visit.id)}
                                      disabled={isLoading || !editSchedDate || (!editSchedAnytime && (!editSchedStartTime || !editSchedEndTime))}
                                      className="bg-[#635BFF] hover:bg-[#5851ea] text-white text-xs h-7 disabled:opacity-50"
                                    >
                                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditScheduleVisitId(null)}
                                      className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  {(visit.status === "SCHEDULED" || visit.status === "ANYTIME") && (
                                    <button
                                      type="button"
                                      onClick={() => handleUnscheduleVisit(visit.id)}
                                      className="text-[10px] text-[#8898AA] hover:text-red-500 underline transition-colors"
                                    >
                                      Remove schedule
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* --- Tech assignment inline editor --- */}
                            {editAssignVisitId === visit.id && (
                              <div className="space-y-2 bg-[#F6F8FA] rounded-lg p-2.5" onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-medium text-[#0A2540]">Assign Team</p>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {teamMembers.map((tm) => {
                                    const isSelected = editAssignUserIds.includes(tm.id)
                                    return (
                                      <label
                                        key={tm.id}
                                        className={cn(
                                          "flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs",
                                          isSelected ? "bg-[#635BFF]/10" : "hover:bg-gray-100"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            setEditAssignUserIds((prev) =>
                                              isSelected
                                                ? prev.filter((id) => id !== tm.id)
                                                : [...prev, tm.id]
                                            )
                                          }}
                                          className="rounded border-gray-300 text-[#635BFF] focus:ring-[#635BFF]"
                                        />
                                        <div
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: tm.color || "#635BFF" }}
                                        />
                                        <span className="text-[#425466]">
                                          {tm.firstName} {tm.lastName}
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignVisit(visit.id)}
                                    disabled={isLoading}
                                    className="bg-[#635BFF] hover:bg-[#5851ea] text-white text-xs h-7"
                                  >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditAssignVisitId(null)}
                                    className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* --- Notes inline editor --- */}
                            {editNotesVisitId === visit.id && (
                              <div className="space-y-2 bg-[#F6F8FA] rounded-lg p-2.5" onClick={(e) => e.stopPropagation()}>
                                <p className="text-xs font-medium text-[#0A2540]">Visit Notes</p>
                                <Textarea
                                  value={editNotesValue}
                                  onChange={(e) => setEditNotesValue(e.target.value)}
                                  placeholder="Add notes for this visit..."
                                  className="min-h-[60px] text-xs border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateVisitNotes(visit.id)}
                                    disabled={isLoading}
                                    className="bg-[#635BFF] hover:bg-[#5851ea] text-white text-xs h-7"
                                  >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setEditNotesVisitId(null); setEditNotesValue("") }}
                                    className="text-xs h-7 border-[#E3E8EE] hover:bg-gray-100"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Show existing notes if not editing */}
                            {editNotesVisitId !== visit.id && visit.notes && (
                              <p className="text-xs text-[#425466] bg-[#F6F8FA] rounded p-2 italic">{visit.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8898AA] text-center py-6">
              No visits yet.
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
      <Card className="border-[#E3E8EE] mb-6">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Line Items ({job.lineItems.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddLineItem(true)}
            className="border-[#E3E8EE]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Item
          </Button>
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
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {job.lineItems.map((li) => {
                  const linkedVisit = li.visitId
                    ? job.visits.find((v) => v.id === li.visitId)
                    : null
                  const isEditing = editingLineItemId === li.id
                  const isDeleting = deletingLineItemId === li.id

                  if (isEditing) {
                    return (
                      <tr key={li.id} className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                        <td className="py-2.5 pr-2">
                          <Input
                            value={editLIName}
                            onChange={(e) => setEditLIName(e.target.value)}
                            className="h-7 text-xs border-[#E3E8EE]"
                          />
                        </td>
                        <td className="py-2.5 text-xs text-[#8898AA]">
                          {linkedVisit ? `Visit #${linkedVisit.visitNumber}` : "--"}
                        </td>
                        <td className="py-2.5 pr-2">
                          <Input
                            type="number"
                            value={editLIQty}
                            onChange={(e) => setEditLIQty(e.target.value)}
                            className="h-7 text-xs text-right w-16 ml-auto border-[#E3E8EE]"
                            min="1"
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editLIPrice}
                            onChange={(e) => setEditLIPrice(e.target.value)}
                            className="h-7 text-xs text-right w-24 ml-auto border-[#E3E8EE]"
                          />
                        </td>
                        <td className="py-2.5 text-right text-xs font-medium text-[#0A2540]">
                          {formatCurrency((Number(editLIQty) || 0) * (Number(editLIPrice) || 0))}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateLineItem(li.id)}
                              disabled={savingLineItem}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            >
                              {savingLineItem ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingLineItemId(null)}
                              className="h-6 w-6 p-0 text-[#8898AA]"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr
                      key={li.id}
                      className="border-b border-[#E3E8EE] group hover:bg-[#F6F8FA]/50"
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
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingLineItemId(li.id)
                              setEditLIName(li.name)
                              setEditLIQty(String(li.quantity))
                              setEditLIPrice(String(li.unitPrice))
                            }}
                            className="h-6 w-6 p-0 text-[#8898AA] hover:text-[#635BFF]"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLineItem(li.id)}
                            disabled={isDeleting}
                            className="h-6 w-6 p-0 text-[#8898AA] hover:text-red-500"
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Add line item inline row */}
                {showAddLineItem && (
                  <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                    <td className="py-2.5 pr-2">
                      <Input
                        value={newLIName}
                        onChange={(e) => setNewLIName(e.target.value)}
                        placeholder="Item name"
                        className="h-7 text-xs border-[#E3E8EE]"
                        autoFocus
                      />
                    </td>
                    <td className="py-2.5 text-xs text-[#8898AA]">--</td>
                    <td className="py-2.5 pr-2">
                      <Input
                        type="number"
                        value={newLIQty}
                        onChange={(e) => setNewLIQty(e.target.value)}
                        className="h-7 text-xs text-right w-16 ml-auto border-[#E3E8EE]"
                        min="1"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={newLIPrice}
                        onChange={(e) => setNewLIPrice(e.target.value)}
                        placeholder="0.00"
                        className="h-7 text-xs text-right w-24 ml-auto border-[#E3E8EE]"
                      />
                    </td>
                    <td className="py-2.5 text-right text-xs font-medium text-[#0A2540]">
                      {formatCurrency((Number(newLIQty) || 0) * (Number(newLIPrice) || 0))}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleAddLineItem}
                          disabled={savingLineItem || !newLIName.trim() || !newLIPrice}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                        >
                          {savingLineItem ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setShowAddLineItem(false); setNewLIName(""); setNewLIPrice(""); setNewLIQty("1") }}
                          className="h-6 w-6 p-0 text-[#8898AA]"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {job.lineItems.length > 0 && (
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
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {job.lineItems.length === 0 && !showAddLineItem && (
            <p className="text-sm text-[#8898AA] text-center py-4">
              No line items yet. Click &quot;Add Item&quot; to add one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* 5. Invoices Section                                                 */}
      {/* ================================================================== */}
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
          {job.invoices.length > 0 ? (
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
          ) : (
            <p className="text-sm text-[#8898AA] text-center py-6">
              No invoices yet. Click &quot;Create Invoice&quot; to create one.
            </p>
          )}
        </CardContent>
      </Card>

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
            Job Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add note form */}
          <div className="space-y-2">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add a job note..."
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

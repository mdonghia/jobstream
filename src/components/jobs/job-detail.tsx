"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MoreHorizontal,
  Play,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Pencil,
  Copy,
  Phone,
  Mail,
  MapPin,
  CalendarIcon,
  Clock,
  Users,
  FileText,
  Plus,
  Upload,
  Send,
  LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
} from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { CompleteJobModal } from "./complete-job-modal"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatPhone,
  getInitials,
  cn,
} from "@/lib/utils"
import { toast } from "sonner"
import { updateJobStatus, addJobNote, toggleChecklistItem, uploadJobAttachment, generateRecurringInstances } from "@/actions/jobs"

// ---- Types ----

interface TeamMemberRef {
  id: string
  firstName: string
  lastName: string
  avatar: string | null
  color: string | null
}

interface JobAssignment {
  user: TeamMemberRef
}

interface ChecklistItemType {
  id: string
  label: string
  isCompleted: boolean
  completedAt: string | null
  sortOrder: number
}

interface JobNote {
  id: string
  content: string
  createdAt: string
  user: {
    firstName: string
    lastName: string
    avatar: string | null
  }
}

interface JobAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string | null
  fileSize: number | null
  createdAt: string
  user: {
    firstName: string
    lastName: string
  }
}

interface LineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  total: number
  taxable: boolean
}

interface JobProperty {
  id: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zip: string
}

interface JobCustomer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  properties: JobProperty[]
}

interface JobQuote {
  id: string
  quoteNumber: string
}

interface JobInvoice {
  id: string
  invoiceNumber: string
  status: string
}

interface Job {
  id: string
  jobNumber: string
  title: string
  description: string | null
  status: string
  priority: string
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  completionNotes: string | null
  cancelReason: string | null
  isRecurring: boolean
  recurrenceRule: string | null
  customer: JobCustomer
  property: JobProperty | null
  quote: JobQuote | null
  assignments: JobAssignment[]
  checklistItems: ChecklistItemType[]
  notes: JobNote[]
  attachments: JobAttachment[]
  lineItems: LineItem[]
  invoices: JobInvoice[]
  createdAt: string
}

interface JobDetailProps {
  job: Job
  currentUserId: string
}

// ---- Priority Badge Styles ----

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-amber-50 text-amber-700",
  URGENT: "bg-red-50 text-red-700",
}

// ---- Component ----

export function JobDetail({ job: initialJob, currentUserId }: JobDetailProps) {
  const router = useRouter()
  const [job, setJob] = useState(initialJob)
  const [loading, setLoading] = useState(false)

  // Checklist state
  const [checklistItems, setChecklistItems] = useState(initialJob.checklistItems)

  // Notes state
  const [notes, setNotes] = useState(initialJob.notes)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  // Complete modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false)

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState(initialJob.attachments)

  // Recurring instances
  const [generatingInstances, setGeneratingInstances] = useState(false)

  // Computed
  const completedChecklistCount = checklistItems.filter(
    (item) => item.isCompleted
  ).length
  const totalChecklistCount = checklistItems.length

  // ---- Status Actions ----

  async function handleStartJob() {
    setLoading(true)
    try {
      const result = await updateJobStatus(job.id, "IN_PROGRESS")
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Job started")
        setJob((prev) => ({
          ...prev,
          status: "IN_PROGRESS",
          actualStart: new Date().toISOString(),
        }))
      }
    } catch {
      toast.error("Failed to start job")
    } finally {
      setLoading(false)
    }
  }

  async function handleReopenJob() {
    setLoading(true)
    try {
      const result = await updateJobStatus(job.id, "SCHEDULED")
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Job reopened")
        setJob((prev) => ({
          ...prev,
          status: "SCHEDULED",
          cancelReason: null,
        }))
      }
    } catch {
      toast.error("Failed to reopen job")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelJob() {
    setCancelling(true)
    try {
      const result = await updateJobStatus(job.id, "CANCELLED", {
        cancelReason: cancelReason.trim() || undefined,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Job cancelled")
        setJob((prev) => ({
          ...prev,
          status: "CANCELLED",
          cancelReason: cancelReason.trim() || null,
        }))
        setCancelModalOpen(false)
        setCancelReason("")
      }
    } catch {
      toast.error("Failed to cancel job")
    } finally {
      setCancelling(false)
    }
  }

  // ---- Checklist ----

  async function handleToggleChecklist(itemId: string) {
    // Optimistic update
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isCompleted: !item.isCompleted,
              completedAt: !item.isCompleted
                ? new Date().toISOString()
                : null,
            }
          : item
      )
    )

    const result = await toggleChecklistItem(itemId)
    if ("error" in result) {
      toast.error(result.error)
      // Revert
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                isCompleted: !item.isCompleted,
                completedAt: item.isCompleted
                  ? new Date().toISOString()
                  : null,
              }
            : item
        )
      )
    }
  }

  // ---- Notes ----

  async function handleAddNote() {
    if (!newNoteContent.trim()) return
    setSavingNote(true)
    try {
      const result = await addJobNote(job.id, newNoteContent.trim())
      if ("error" in result) {
        toast.error(result.error)
      } else if (result.note) {
        setNotes((prev) => [result.note as any, ...prev])
        setNewNoteContent("")
        toast.success("Note added")
      }
    } catch {
      toast.error("Failed to add note")
    } finally {
      setSavingNote(false)
    }
  }

  // ---- File Upload ----

  async function handleFileUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        const result = await uploadJobAttachment(job.id, formData)
        if ("error" in result) {
          toast.error(result.error)
        } else if (result.attachment) {
          setAttachments((prev) => [
            {
              ...result.attachment,
              createdAt:
                result.attachment.createdAt instanceof Date
                  ? result.attachment.createdAt.toISOString()
                  : result.attachment.createdAt,
              user: { firstName: "You", lastName: "" },
            } as any,
            ...prev,
          ])
          toast.success(`Uploaded ${files[i].name}`)
        }
      }
    } catch {
      toast.error("Failed to upload file")
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ---- Generate Recurring Instances ----

  async function handleGenerateRecurring() {
    setGeneratingInstances(true)
    try {
      const result = await generateRecurringInstances(job.id)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(`Generated ${result.created} recurring job instances`)
        router.refresh()
      }
    } catch {
      toast.error("Failed to generate recurring instances")
    } finally {
      setGeneratingInstances(false)
    }
  }

  // ---- Activity Timeline (computed from job data) ----
  type ActivityItem = {
    id: string
    type: "created" | "status" | "note" | "checklist"
    description: string
    timestamp: string
    user?: string
  }

  const activityItems: ActivityItem[] = []

  // Job created
  activityItems.push({
    id: "created",
    type: "created",
    description: "Job created",
    timestamp: job.createdAt,
  })

  // Status changes inferred from dates
  if (job.actualStart) {
    activityItems.push({
      id: "started",
      type: "status",
      description: "Job started",
      timestamp: job.actualStart,
    })
  }
  if (job.actualEnd) {
    activityItems.push({
      id: "completed",
      type: "status",
      description: "Job completed",
      timestamp: job.actualEnd,
    })
  }

  // Notes
  notes.forEach((note) => {
    activityItems.push({
      id: `note-${note.id}`,
      type: "note",
      description: `Note added: "${note.content.slice(0, 60)}${
        note.content.length > 60 ? "..." : ""
      }"`,
      timestamp: note.createdAt,
      user: `${note.user.firstName} ${note.user.lastName}`,
    })
  })

  // Sort by timestamp ascending (oldest first)
  activityItems.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // ---- Render ----

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 mt-1" aria-label="Go back">
            <Link href="/jobs">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-[#0A2540]">
                {job.title}
              </h1>
              <StatusBadge status={job.status === "SCHEDULED" && job.scheduledStart && new Date(job.scheduledStart).getFullYear() <= 2000 ? "UNSCHEDULED" : job.status} />
            </div>
            <p className="text-sm text-[#8898AA] mt-0.5 font-mono">
              {job.jobNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Status action buttons */}
          {job.status === "SCHEDULED" && (
            <Button
              onClick={handleStartJob}
              disabled={loading}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Start Job
            </Button>
          )}
          {job.status === "IN_PROGRESS" && (
            <Button
              onClick={() => setCompleteModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Complete Job
            </Button>
          )}
          {job.status === "COMPLETED" && (
            <Button asChild className="bg-[#635BFF] hover:bg-[#5851ea] text-white">
              <Link href={`/invoices/new?jobId=${job.id}`}>
                <FileText className="w-4 h-4 mr-1.5" />
                Create Invoice
              </Link>
            </Button>
          )}
          {job.status === "CANCELLED" && (
            <Button
              onClick={handleReopenJob}
              disabled={loading}
              variant="outline"
              className="border-[#E3E8EE]"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reopen
            </Button>
          )}

          {/* Generate Recurring Instances button */}
          {job.isRecurring && (
            <Button
              onClick={handleGenerateRecurring}
              disabled={generatingInstances}
              variant="outline"
              className="border-[#E3E8EE] text-[#425466]"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {generatingInstances ? "Generating..." : "Generate Schedule"}
            </Button>
          )}

          {/* 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 border-[#E3E8EE]" aria-label="More actions">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/jobs/${job.id}/edit`}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Job
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/jobs/new?duplicate=${job.id}`}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Link>
              </DropdownMenuItem>
              {(job.status === "SCHEDULED" || job.status === "IN_PROGRESS") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelModalOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Job
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info Card + Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card className="border-[#E3E8EE]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Customer */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                    Customer
                  </p>
                  <Link
                    href={`/customers/${job.customer.id}`}
                    className="text-sm font-medium text-[#0A2540] hover:text-[#635BFF]"
                  >
                    {job.customer.firstName} {job.customer.lastName}
                  </Link>
                  {job.customer.phone && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#8898AA]" />
                      <span className="text-sm text-[#425466]">
                        {formatPhone(job.customer.phone)}
                      </span>
                    </div>
                  )}
                  {job.customer.email && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5 text-[#8898AA]" />
                      <span className="text-sm text-[#425466]">
                        {job.customer.email}
                      </span>
                    </div>
                  )}
                </div>

                {/* Property */}
                {job.property && (
                  <div>
                    <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                      Property
                    </p>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#8898AA] mt-0.5" />
                      <div className="text-sm text-[#425466]">
                        <p>{job.property.addressLine1}</p>
                        {job.property.addressLine2 && (
                          <p>{job.property.addressLine2}</p>
                        )}
                        <p>
                          {job.property.city}, {job.property.state}{" "}
                          {job.property.zip}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                    Scheduled
                  </p>
                  {job.scheduledStart && new Date(job.scheduledStart).getFullYear() > 2000 ? (
                    <div className="flex items-start gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#8898AA] mt-0.5" />
                      <div className="text-sm text-[#425466]">
                        <p>{formatDate(job.scheduledStart)}</p>
                        <p className="text-xs text-[#8898AA]">
                          {formatTime(job.scheduledStart)}
                          {job.scheduledEnd &&
                            ` - ${formatTime(job.scheduledEnd)}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600 font-medium">Unscheduled</p>
                  )}
                </div>

                {/* Assigned */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                    Assigned To
                  </p>
                  {job.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {job.assignments.map((a) => (
                        <div
                          key={a.user.id}
                          className="flex items-center gap-1.5"
                        >
                          <Avatar size="sm">
                            {a.user.avatar ? (
                              <AvatarImage src={a.user.avatar} />
                            ) : null}
                            <AvatarFallback
                              className="text-[10px]"
                              style={{
                                backgroundColor: a.user.color || "#635BFF",
                                color: "#fff",
                              }}
                            >
                              {getInitials(a.user.firstName, a.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-[#425466]">
                            {a.user.firstName} {a.user.lastName}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8898AA]">Unassigned</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                    Priority
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.MEDIUM
                    }`}
                  >
                    {job.priority.charAt(0) +
                      job.priority.slice(1).toLowerCase()}
                  </span>
                </div>

                {/* Related links */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                    Related
                  </p>
                  <div className="space-y-1">
                    {job.quote && (
                      <Link
                        href={`/quotes/${job.quote.id}`}
                        className="flex items-center gap-1.5 text-sm text-[#635BFF] hover:underline"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Quote {job.quote.quoteNumber}
                      </Link>
                    )}
                    {job.invoices.map((inv) => (
                      <Link
                        key={inv.id}
                        href={`/invoices/${inv.id}`}
                        className="flex items-center gap-1.5 text-sm text-[#635BFF] hover:underline"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Invoice {inv.invoiceNumber}
                      </Link>
                    ))}
                    {!job.quote && job.invoices.length === 0 && (
                      <p className="text-sm text-[#8898AA]">None</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {job.description && (
                <>
                  <Separator className="my-4 bg-[#E3E8EE]" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                      Description
                    </p>
                    <p className="text-sm text-[#425466] whitespace-pre-wrap">
                      {job.description}
                    </p>
                  </div>
                </>
              )}

              {/* Completion / Cancel notes */}
              {job.completionNotes && (
                <>
                  <Separator className="my-4 bg-[#E3E8EE]" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                      Completion Notes
                    </p>
                    <p className="text-sm text-[#425466] whitespace-pre-wrap">
                      {job.completionNotes}
                    </p>
                  </div>
                </>
              )}
              {job.cancelReason && (
                <>
                  <Separator className="my-4 bg-[#E3E8EE]" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-[#8898AA] mb-2">
                      Cancellation Reason
                    </p>
                    <p className="text-sm text-red-600 whitespace-pre-wrap">
                      {job.cancelReason}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Checklist, Notes, Attachments, Time */}
          <Tabs defaultValue="checklist">
            <TabsList variant="line" className="border-b border-[#E3E8EE] w-full justify-start">
              <TabsTrigger value="checklist" className="text-sm">
                Checklist
                {totalChecklistCount > 0 && (
                  <span className="ml-1.5 text-xs text-[#8898AA]">
                    ({completedChecklistCount}/{totalChecklistCount})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-sm">
                Notes
                <span className="ml-1.5 text-xs text-[#8898AA]">
                  ({notes.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="text-sm">
                Attachments
              </TabsTrigger>
              <TabsTrigger value="time" className="text-sm">
                Time
              </TabsTrigger>
            </TabsList>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="mt-4">
              <Card className="border-[#E3E8EE]">
                <CardContent className="pt-6">
                  {totalChecklistCount > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-[#425466]">
                          {completedChecklistCount} of {totalChecklistCount}{" "}
                          completed
                        </p>
                        <span className="text-sm font-medium text-[#0A2540]">
                          {totalChecklistCount > 0
                            ? Math.round(
                                (completedChecklistCount / totalChecklistCount) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#E3E8EE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#635BFF] rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              totalChecklistCount > 0
                                ? (completedChecklistCount /
                                    totalChecklistCount) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F6F8FA] transition-colors"
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => handleToggleChecklist(item.id)}
                        />
                        <span
                          className={cn(
                            "text-sm flex-1",
                            item.isCompleted
                              ? "text-[#8898AA] line-through"
                              : "text-[#0A2540]"
                          )}
                        >
                          {item.label}
                        </span>
                        {item.completedAt && (
                          <span className="text-xs text-[#8898AA]">
                            {formatRelativeTime(item.completedAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {totalChecklistCount === 0 && (
                    <p className="text-sm text-[#8898AA] text-center py-6">
                      No checklist items for this job.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4">
              <Card className="border-[#E3E8EE]">
                <CardContent className="pt-6 space-y-4">
                  {/* Add note */}
                  <div className="space-y-2">
                    <Textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add a note..."
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

                  <Separator className="bg-[#E3E8EE]" />

                  {/* Notes list */}
                  {notes.length > 0 ? (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="flex gap-3">
                          <Avatar size="sm">
                            {note.user.avatar ? (
                              <AvatarImage src={note.user.avatar} />
                            ) : null}
                            <AvatarFallback className="text-[10px] bg-[#635BFF]/10 text-[#635BFF]">
                              {getInitials(
                                note.user.firstName,
                                note.user.lastName
                              )}
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
                  ) : (
                    <p className="text-sm text-[#8898AA] text-center py-4">
                      No notes yet. Add the first note above.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="mt-4">
              <Card className="border-[#E3E8EE]">
                <CardContent className="pt-6">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    multiple
                  />

                  {/* Upload zone */}
                  <div
                    className="border-2 border-dashed border-[#E3E8EE] rounded-lg p-8 text-center hover:border-[#635BFF]/30 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.add("border-[#635BFF]")
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.remove("border-[#635BFF]")
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.classList.remove("border-[#635BFF]")
                      handleFileUpload(e.dataTransfer.files)
                    }}
                  >
                    <Upload className="w-10 h-10 text-[#8898AA] mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#0A2540]">
                      {uploading ? "Uploading..." : "Drag and drop files here"}
                    </p>
                    <p className="text-xs text-[#8898AA] mt-1">
                      or click to browse files
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-[#E3E8EE] text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                      disabled={uploading}
                    >
                      Browse Files
                    </Button>
                  </div>

                  {/* Existing attachments */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      {attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-[#E3E8EE] rounded-lg p-3 hover:border-[#635BFF]/30 transition-colors block"
                        >
                          <div className="w-full h-20 bg-[#F6F8FA] rounded flex items-center justify-center mb-2">
                            {attachment.fileType?.startsWith("image/") ? (
                              <img
                                src={attachment.fileUrl}
                                alt={attachment.fileName}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <FileText className="w-8 h-8 text-[#8898AA]" />
                            )}
                          </div>
                          <p className="text-xs font-medium text-[#0A2540] truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-[10px] text-[#8898AA]">
                            {attachment.user.firstName}{" "}
                            {attachment.user.lastName} &middot;{" "}
                            {formatRelativeTime(attachment.createdAt)}
                          </p>
                        </a>
                      ))}
                    </div>
                  )}

                  {attachments.length === 0 && (
                    <p className="text-sm text-[#8898AA] text-center mt-4">
                      No attachments yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Time Tab */}
            <TabsContent value="time" className="mt-4">
              <Card className="border-[#E3E8EE]">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {job.actualStart && (
                      <div className="flex items-center justify-between p-3 bg-[#F6F8FA] rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#8898AA]" />
                          <div>
                            <p className="text-sm text-[#0A2540]">
                              Job Duration
                            </p>
                            <p className="text-xs text-[#8898AA]">
                              Started: {formatDateTime(job.actualStart)}
                              {job.actualEnd && (
                                <>
                                  {" "}
                                  | Ended: {formatDateTime(job.actualEnd)}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {job.actualStart && job.actualEnd && (
                          <span className="text-sm font-medium text-[#0A2540]">
                            {(() => {
                              const diffMs =
                                new Date(job.actualEnd).getTime() -
                                new Date(job.actualStart).getTime()
                              const diffHrs = Math.floor(
                                diffMs / (1000 * 60 * 60)
                              )
                              const diffMins = Math.round(
                                (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                              )
                              return `${diffHrs}h ${diffMins}m`
                            })()}
                          </span>
                        )}
                      </div>
                    )}

                    {!job.actualStart && (
                      <p className="text-sm text-[#8898AA] text-center py-6">
                        No time entries for this job yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Line Items */}
          {job.lineItems.length > 0 && (
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#0A2540]">
                  Services & Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E3E8EE]">
                        <th className="text-left py-2 text-xs font-semibold uppercase text-[#8898AA]">
                          Service
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
                      {job.lineItems.map((li) => (
                        <tr key={li.id} className="border-b border-[#E3E8EE]">
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
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td
                          colSpan={3}
                          className="text-right py-2.5 font-semibold text-[#0A2540]"
                        >
                          Total
                        </td>
                        <td className="text-right py-2.5 font-semibold text-[#0A2540]">
                          {formatCurrency(
                            job.lineItems.reduce((sum, li) => sum + li.total, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-1">
          <Card className="border-[#E3E8EE] sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E3E8EE]" />

                <div className="space-y-4">
                  {activityItems.map((item) => (
                    <div key={item.id} className="flex gap-3 relative">
                      {/* Dot */}
                      <div
                        className={cn(
                          "w-[15px] h-[15px] rounded-full border-2 border-white flex-shrink-0 mt-0.5 z-10",
                          item.type === "created" && "bg-[#635BFF]",
                          item.type === "status" && "bg-green-500",
                          item.type === "note" && "bg-blue-400",
                          item.type === "checklist" && "bg-amber-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0A2540]">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.user && (
                            <span className="text-xs text-[#8898AA]">
                              {item.user}
                            </span>
                          )}
                          <span className="text-xs text-[#8898AA]">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Job Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Cancel Job</DialogTitle>
            <DialogDescription className="text-[#425466]">
              Are you sure you want to cancel {job.jobNumber} - {job.title}?
              This action can be undone by reopening the job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-sm text-[#425466]">
              Reason for cancellation
            </Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional: Why is this job being cancelled?"
              className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              className="border-[#E3E8EE]"
            >
              Keep Job
            </Button>
            <Button
              onClick={handleCancelJob}
              disabled={cancelling}
              variant="destructive"
            >
              {cancelling ? "Cancelling..." : "Cancel Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Job Modal */}
      <CompleteJobModal
        job={{
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          customerId: job.customer.id,
          checklistItems: checklistItems,
        }}
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
      />
    </div>
  )
}

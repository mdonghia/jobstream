"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  format,
  parseISO,
  addMinutes,
  isSameDay,
} from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { rescheduleJob, reassignJob } from "@/actions/jobs"

import { CalendarView } from "./calendar-view"
import { UnscheduledSidebar } from "./unscheduled-sidebar"
import { DragOverlayJob } from "./dnd-wrappers"
import type { DragData, DropData } from "./dnd-wrappers"
import type { CalendarJob } from "./month-view"
import type { TeamMember } from "./day-view"
import type { UnscheduledJob } from "./unscheduled-sidebar"

// ── Pending action types ───────────────────────────────────────────────────────

interface PendingReschedule {
  type: "reschedule"
  jobId: string
  jobNumber: string
  newDate: string
  newTime: string
  newStart: Date
  newEnd: Date
  oldStart: string
  oldEnd: string | null
  hasConflict: boolean
  conflictInfo?: string
}

interface PendingReassign {
  type: "reassign"
  jobId: string
  jobNumber: string
  oldMemberId: string
  oldMemberName: string
  newMemberId: string
  newMemberName: string
  newDate: string
  newTime: string
  newStart: Date
  newEnd: Date
  oldStart: string
  oldEnd: string | null
}

interface PendingSchedule {
  type: "schedule"
  jobId: string
  jobNumber: string
  newDate: string
  newTime: string
  newStart: Date
  newEnd: Date
  hasConflict: boolean
  conflictInfo?: string
}

type PendingAction = PendingReschedule | PendingReassign | PendingSchedule

// ── Props ──────────────────────────────────────────────────────────────────────

interface ScheduleLayoutProps {
  initialJobs: CalendarJob[]
  teamMembers: TeamMember[]
  unscheduledJobs: UnscheduledJob[]
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ScheduleLayout({ initialJobs, teamMembers, unscheduledJobs }: ScheduleLayoutProps) {
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localUnscheduledJobs, setLocalUnscheduledJobs] = useState<UnscheduledJob[]>(unscheduledJobs)

  // Sync local state when parent prop changes (e.g. after page navigation)
  useEffect(() => {
    setLocalUnscheduledJobs(unscheduledJobs)
  }, [unscheduledJobs])

  // Store a reference to the CalendarView's jobs and refetch function
  const jobsRef = useRef<CalendarJob[]>(initialJobs)
  const refetchRef = useRef<(() => Promise<void>) | null>(null)
  const activeMembersRef = useRef<TeamMember[]>(teamMembers.filter((m) => m.isActive))

  // Pointer sensor with activation constraint so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Callbacks for CalendarView to register its state
  const onJobsChange = useCallback((jobs: CalendarJob[]) => {
    jobsRef.current = jobs
  }, [])

  const onRefetchReady = useCallback((refetch: () => Promise<void>) => {
    refetchRef.current = refetch
  }, [])

  const onActiveMembersChange = useCallback((members: TeamMember[]) => {
    activeMembersRef.current = members
  }, [])

  // ── Conflict detection ───────────────────────────────────────────────────

  function findConflicts(
    targetDate: string,
    targetStart: Date,
    targetEnd: Date,
    memberId?: string,
    excludeJobId?: string
  ): { hasConflict: boolean; conflictInfo: string } {
    const jobs = jobsRef.current
    const conflictingJobs = jobs.filter((job) => {
      if (excludeJobId && job.id === excludeJobId) return false

      const jobStart = parseISO(job.scheduledStart)
      if (!isSameDay(jobStart, parseISO(targetDate))) return false

      if (memberId) {
        const isAssigned = job.assignments.some((a) => a.user.id === memberId)
        if (!isAssigned) return false
      }

      const jobEnd = job.scheduledEnd
        ? parseISO(job.scheduledEnd)
        : addMinutes(jobStart, 60)

      return targetStart < jobEnd && jobStart < targetEnd
    })

    if (conflictingJobs.length === 0) {
      return { hasConflict: false, conflictInfo: "" }
    }

    const info = conflictingJobs
      .map((j) => {
        const start = format(parseISO(j.scheduledStart), "h:mm a")
        const end = j.scheduledEnd
          ? format(parseISO(j.scheduledEnd), "h:mm a")
          : format(addMinutes(parseISO(j.scheduledStart), 60), "h:mm a")
        return `${j.jobNumber} (${start} - ${end})`
      })
      .join(", ")

    return { hasConflict: true, conflictInfo: info }
  }

  // ── DnD handlers ────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData
    setActiveDragData(data)
  }

  function handleDragOver(_event: DragOverEvent) {
    // Live conflict highlighting is handled via DroppableSlot isConflict prop
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragData(null)

    if (!over) return

    const dragData = active.data.current as DragData
    const dropData = over.data.current as DropData

    if (!dragData || !dropData) return

    const jobId = dragData.job.id
    const dropDate = dropData.date
    const dropTime = dropData.time || "09:00"
    const [dropHour, dropMin] = dropTime.split(":").map(Number)

    const newStart = new Date(`${dropDate}T${dropTime}:00`)

    // Preserve original duration for rescheduling existing jobs
    let duration = 60
    if (dragData.type === "job" && "scheduledEnd" in dragData.job && dragData.job.scheduledEnd) {
      const origStart = parseISO(dragData.job.scheduledStart as string)
      const origEnd = parseISO(dragData.job.scheduledEnd as string)
      duration = Math.max((origEnd.getTime() - origStart.getTime()) / 60000, 30)
    }
    const adjustedEnd = addMinutes(newStart, duration)

    const jobNumber = "jobNumber" in dragData.job ? dragData.job.jobNumber : `JOB-${jobId.slice(0, 4)}`
    const activeMembers = activeMembersRef.current

    if (dragData.type === "unscheduled") {
      const { hasConflict, conflictInfo } = findConflicts(dropDate, newStart, adjustedEnd)
      setPendingAction({
        type: "schedule",
        jobId,
        jobNumber,
        newDate: dropDate,
        newTime: dropTime,
        newStart,
        newEnd: adjustedEnd,
        hasConflict,
        conflictInfo,
      })
      setDialogOpen(true)
      return
    }

    if (dragData.type === "job") {
      const calJob = dragData.job as CalendarJob

      // Check if this is a reassignment (different column in day view)
      if (
        dropData.memberId &&
        dragData.sourceMemberId &&
        dropData.memberId !== dragData.sourceMemberId
      ) {
        const oldMember = activeMembers.find((m) => m.id === dragData.sourceMemberId)
        const newMember = activeMembers.find((m) => m.id === dropData.memberId)

        setPendingAction({
          type: "reassign",
          jobId,
          jobNumber,
          oldMemberId: dragData.sourceMemberId,
          oldMemberName: oldMember ? `${oldMember.firstName} ${oldMember.lastName}` : "Unknown",
          newMemberId: dropData.memberId,
          newMemberName: newMember ? `${newMember.firstName} ${newMember.lastName}` : "Unknown",
          newDate: dropDate,
          newTime: dropTime,
          newStart,
          newEnd: adjustedEnd,
          oldStart: calJob.scheduledStart,
          oldEnd: calJob.scheduledEnd,
        })
        setDialogOpen(true)
        return
      }

      // Check if dropped on same slot (no change)
      if (dragData.sourceDate === dropDate) {
        const origStart = parseISO(calJob.scheduledStart)
        const origHour = origStart.getHours()
        const origSlot = Math.floor(origStart.getMinutes() / 15) * 15
        if (origHour === dropHour && origSlot === Math.floor(dropMin / 15) * 15) {
          return
        }
      }

      const memberId = calJob.assignments.length > 0 ? calJob.assignments[0].user.id : undefined
      const { hasConflict, conflictInfo } = findConflicts(dropDate, newStart, adjustedEnd, memberId, jobId)

      setPendingAction({
        type: "reschedule",
        jobId,
        jobNumber,
        newDate: dropDate,
        newTime: dropTime,
        newStart,
        newEnd: adjustedEnd,
        oldStart: calJob.scheduledStart,
        oldEnd: calJob.scheduledEnd,
        hasConflict,
        conflictInfo,
      })
      setDialogOpen(true)
    }
  }

  // ── Confirm / Cancel ─────────────────────────────────────────────────────

  async function confirmAction() {
    if (!pendingAction) return

    const action = pendingAction
    setDialogOpen(false)
    setPendingAction(null)

    try {
      if (action.type === "reschedule" || action.type === "schedule") {
        const result = await rescheduleJob(
          action.jobId,
          action.newStart.toISOString(),
          action.newEnd.toISOString()
        )

        if ("error" in result) {
          toast.error(result.error as string)
          return
        }

        const actionLabel = action.type === "schedule" ? "scheduled" : "rescheduled"

        // Remove from unscheduled sidebar immediately after scheduling
        if (action.type === "schedule") {
          setLocalUnscheduledJobs(prev => prev.filter(j => j.id !== action.jobId))
        }

        toast.success(`Job ${actionLabel}. The customer will be notified. Undo?`, {
          duration: 5000,
          action: {
            label: "Undo",
            onClick: async () => {
              if (action.type === "reschedule") {
                const undoResult = await rescheduleJob(
                  action.jobId,
                  action.oldStart,
                  action.oldEnd || action.oldStart
                )
                if ("error" in undoResult) {
                  toast.error("Failed to undo")
                } else {
                  toast.info("Reschedule undone")
                  refetchRef.current?.()
                }
              } else {
                const undoResult = await rescheduleJob(
                  action.jobId,
                  new Date(0).toISOString(),
                  new Date(0).toISOString()
                )
                if ("error" in undoResult) {
                  toast.error("Failed to undo")
                } else {
                  toast.info("Schedule undone")
                  // Restore the job back to the unscheduled sidebar
                  setLocalUnscheduledJobs(unscheduledJobs)
                  refetchRef.current?.()
                }
              }
            },
          },
        })

        refetchRef.current?.()

      } else if (action.type === "reassign") {
        const activeMembers = activeMembersRef.current
        const calJob = jobsRef.current.find((j) => j.id === action.jobId)
        const timeChanged = calJob && (
          calJob.scheduledStart !== action.newStart.toISOString() ||
          calJob.scheduledEnd !== action.newEnd.toISOString()
        )

        const [reassignResult] = await Promise.all([
          reassignJob(action.jobId, [action.newMemberId]),
          timeChanged
            ? rescheduleJob(action.jobId, action.newStart.toISOString(), action.newEnd.toISOString())
            : Promise.resolve({ success: true }),
        ])

        if ("error" in reassignResult) {
          toast.error(reassignResult.error as string)
          return
        }

        toast.success("Job reassigned. Undo?", {
          duration: 5000,
          action: {
            label: "Undo",
            onClick: async () => {
              const undoResult = await reassignJob(action.jobId, [action.oldMemberId])
              if (timeChanged && action.oldStart) {
                await rescheduleJob(action.jobId, action.oldStart, action.oldEnd || action.oldStart)
              }
              if ("error" in undoResult) {
                toast.error("Failed to undo")
              } else {
                toast.info("Reassignment undone")
                refetchRef.current?.()
              }
            },
          },
        })

        refetchRef.current?.()
      }
    } catch (error) {
      toast.error("Something went wrong")
    }
  }

  function cancelAction() {
    setDialogOpen(false)
    setPendingAction(null)
  }

  // ── Dialog content ─────────────────────────────────────────────────────

  function getDialogContent() {
    if (!pendingAction) return { title: "", description: "", hasConflict: false, conflictInfo: "" }

    const dateStr = format(parseISO(pendingAction.newDate), "EEEE, MMMM d, yyyy")
    const timeStr = pendingAction.newTime
      ? format(new Date(`2000-01-01T${pendingAction.newTime}:00`), "h:mm a")
      : ""

    switch (pendingAction.type) {
      case "reschedule":
        return {
          title: `Reschedule ${pendingAction.jobNumber}?`,
          description: `Move this job to ${dateStr} at ${timeStr}? The customer will be notified of the change.`,
          hasConflict: pendingAction.hasConflict,
          conflictInfo: pendingAction.conflictInfo || "",
        }
      case "reassign":
        return {
          title: `Reassign ${pendingAction.jobNumber}?`,
          description: `Reassign from ${pendingAction.oldMemberName} to ${pendingAction.newMemberName}?`,
          hasConflict: false,
          conflictInfo: "",
        }
      case "schedule":
        return {
          title: `Schedule ${pendingAction.jobNumber}?`,
          description: `Schedule this job for ${dateStr} at ${timeStr}? The customer will be notified.`,
          hasConflict: pendingAction.hasConflict,
          conflictInfo: pendingAction.conflictInfo || "",
        }
    }
  }

  const dialogContent = getDialogContent()

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-64px)]">
        {/* Main calendar area */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2540]">Schedule</h1>
              <p className="text-sm text-[#8898AA] mt-0.5">
                Manage your team&apos;s schedule and job assignments.
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CalendarView
              initialJobs={initialJobs}
              teamMembers={teamMembers}
              onJobsChange={onJobsChange}
              onRefetchReady={onRefetchReady}
              onActiveMembersChange={onActiveMembersChange}
            />
          </div>
        </div>

        {/* Unscheduled sidebar */}
        <UnscheduledSidebar jobs={localUnscheduledJobs} />
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragData ? <DragOverlayJob job={activeDragData.job} /> : null}
      </DragOverlay>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={(open) => { if (!open) cancelAction() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0A2540]">
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#425466]">
              {dialogContent.description}
              {dialogContent.hasConflict && (
                <span className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>Conflict detected.</strong> Overlaps with {dialogContent.conflictInfo}.
                    Scheduling anyway may result in double-booking.
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {dialogContent.hasConflict ? "Schedule Anyway" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  )
}

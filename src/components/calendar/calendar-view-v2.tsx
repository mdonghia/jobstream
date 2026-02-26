"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  format,
  parseISO,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  differenceInMinutes,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  addMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  Car,
  Wrench,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  GripVertical,
  CalendarDays,
  CalendarRange,
  ArrowUpDown,
  ArrowLeftRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getCalendarVisits, rescheduleVisit, assignVisit } from "@/actions/visits"
import { toast } from "sonner"
import { WeekGrid } from "./week-grid"
import { MoveConfirmationDialog } from "./move-confirmation-dialog"
import type {
  CalendarVisit,
  TeamMember,
  TimeMode,
  OrientationMode,
  BusinessHours,
  MoveConfirmation,
} from "./calendar-types"
import {
  getVisitColor,
  getPurposeLabel,
  getBusinessStartHour,
  getBusinessEndHour,
  DAY_KEYS,
} from "./calendar-types"

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64 // px per hour
const SNAP_INCREMENT = 30 // minutes (item #3: changed from 15 to 30)

// ── Types ─────────────────────────────────────────────────────────────────────

// Re-export for backward compat
export type { CalendarVisit, TeamMember }

interface CalendarViewV2Props {
  initialVisits: CalendarVisit[]
  unscheduledVisits: CalendarVisit[]
  anytimeVisits: CalendarVisit[]
  teamMembers: TeamMember[]
  businessHours: BusinessHours
}

// ── Status icons ──────────────────────────────────────────────────────────────

function VisitStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "EN_ROUTE":
      return <Car className="w-3 h-3 text-blue-500 shrink-0" />
    case "IN_PROGRESS":
      return <Wrench className="w-3 h-3 text-amber-500 shrink-0" />
    case "COMPLETED":
      return <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
    case "SCHEDULED":
      return <Clock className="w-3 h-3 text-[#8898AA] shrink-0" />
    default:
      return null
  }
}

// ── Visit position helpers ────────────────────────────────────────────────────

function getVisitPosition(visit: CalendarVisit, dayStartHour: number) {
  if (!visit.scheduledStart) return { top: 0, height: HOUR_HEIGHT, durationMinutes: 60 }

  const start = parseISO(visit.scheduledStart)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const topMinutes = Math.max(startMinutes - dayStartHour * 60, 0)

  let durationMinutes = 60
  if (visit.scheduledEnd) {
    const end = parseISO(visit.scheduledEnd)
    durationMinutes = differenceInMinutes(end, start)
  }
  durationMinutes = Math.max(durationMinutes, 30)

  const top = (topMinutes / 60) * HOUR_HEIGHT
  const height = (durationMinutes / 60) * HOUR_HEIGHT

  return { top, height, durationMinutes }
}

// ── Overlap layout ──────────────────────────────────────────────────────────

function computeVisitOverlapLayout(
  visits: CalendarVisit[]
): Map<string, { colIndex: number; totalCols: number }> {
  const result = new Map<string, { colIndex: number; totalCols: number }>()
  if (visits.length === 0) return result

  const parsed = visits
    .filter((v) => v.scheduledStart)
    .map((v) => {
      const start = parseISO(v.scheduledStart!)
      const startMin = start.getHours() * 60 + start.getMinutes()
      let endMin = startMin + 60
      if (v.scheduledEnd) {
        const end = parseISO(v.scheduledEnd)
        endMin = end.getHours() * 60 + end.getMinutes()
      }
      if (endMin - startMin < 30) endMin = startMin + 30
      return { id: v.id, startMin, endMin }
    })

  parsed.sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return b.endMin - b.startMin - (a.endMin - a.startMin)
  })

  const clusters: (typeof parsed)[] = []
  let currentCluster: typeof parsed = []
  let clusterEnd = -1

  for (const item of parsed) {
    if (currentCluster.length === 0 || item.startMin < clusterEnd) {
      currentCluster.push(item)
      clusterEnd = Math.max(clusterEnd, item.endMin)
    } else {
      clusters.push(currentCluster)
      currentCluster = [item]
      clusterEnd = item.endMin
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster)

  for (const cluster of clusters) {
    const columnEnds: number[] = []
    for (const item of cluster) {
      let assignedCol = -1
      for (let c = 0; c < columnEnds.length; c++) {
        if (item.startMin >= columnEnds[c]) {
          assignedCol = c
          break
        }
      }
      if (assignedCol === -1) {
        assignedCol = columnEnds.length
        columnEnds.push(item.endMin)
      } else {
        columnEnds[assignedCol] = item.endMin
      }
      result.set(item.id, { colIndex: assignedCol, totalCols: 0 })
    }
    const totalCols = columnEnds.length
    for (const item of cluster) {
      const info = result.get(item.id)!
      info.totalCols = totalCols
    }
  }

  return result
}

// ── Drag-and-drop constant ────────────────────────────────────────────────────

const DRAG_DATA_TYPE = "application/x-visit-id"

// ── Main Component ────────────────────────────────────────────────────────────

export function CalendarViewV2({
  initialVisits,
  unscheduledVisits: initialUnscheduled,
  anytimeVisits: initialAnytime,
  teamMembers,
  businessHours,
}: CalendarViewV2Props) {
  const router = useRouter()

  // Item #8, #15, #18: Independent Day/Week and Vertical/Horizontal toggles
  const [timeMode, setTimeMode] = useState<TimeMode>("day")
  const [orientation, setOrientation] = useState<OrientationMode>("vertical")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [visits, setVisits] = useState<CalendarVisit[]>(initialVisits)
  const [unscheduledVisits, setUnscheduledVisits] = useState<CalendarVisit[]>(initialUnscheduled)
  const [anytimeVisits, setAnytimeVisits] = useState<CalendarVisit[]>(initialAnytime)
  // Item #4: Initialize with all member IDs so checkboxes are checked by default
  const activeMembers = useMemo(
    () => teamMembers.filter((m) => m.isActive),
    [teamMembers]
  )
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    () => activeMembers.map((m) => m.id)
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  // Item #25: Move confirmation dialog state
  const [pendingMove, setPendingMove] = useState<MoveConfirmation | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Item #27, #28: Business hours determine calendar time range
  const dayStartHour = useMemo(() => getBusinessStartHour(businessHours), [businessHours])
  const dayEndHour = useMemo(() => getBusinessEndHour(businessHours), [businessHours])
  const dayTotalHours = dayEndHour - dayStartHour

  // Item #4: Filtered members -- now filters from full set (all checked = show all)
  const displayMembers = useMemo(() => {
    // If all members are selected, show all
    if (selectedMemberIds.length === activeMembers.length) {
      return activeMembers
    }
    return activeMembers.filter((m) => selectedMemberIds.includes(m.id))
  }, [activeMembers, selectedMemberIds])

  const hours = useMemo(
    () => Array.from({ length: dayTotalHours }, (_, i) => dayStartHour + i),
    [dayStartHour, dayTotalHours]
  )

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchVisits = useCallback(
    async (date: Date, memberIds: string[]) => {
      setLoading(true)
      try {
        let rangeStart: Date
        let rangeEnd: Date

        if (timeMode === "week") {
          rangeStart = startOfWeek(date, { weekStartsOn: 1 })
          rangeEnd = endOfWeek(date, { weekStartsOn: 1 })
        } else {
          rangeStart = startOfDay(date)
          rangeEnd = endOfDay(date)
        }

        // Only pass userIds filter if not all members are selected
        const filterIds = memberIds.length < activeMembers.length ? memberIds : undefined

        const scheduledResult = await getCalendarVisits({
          start: rangeStart.toISOString(),
          end: rangeEnd.toISOString(),
          userIds: filterIds,
        })

        if (!("error" in scheduledResult)) {
          const allVisits = JSON.parse(JSON.stringify(scheduledResult.visits)) as CalendarVisit[]
          const scheduled = allVisits.filter(
            (v) => v.status === "SCHEDULED" || v.status === "EN_ROUTE" || v.status === "IN_PROGRESS" || v.status === "COMPLETED" || v.status === "CANCELLED"
          )
          const anytime = allVisits.filter((v) => v.status === "ANYTIME")
          setVisits(scheduled)
          setAnytimeVisits(anytime)
        } else {
          toast.error(scheduledResult.error as string)
        }
      } catch {
        toast.error("Failed to load calendar visits")
      } finally {
        setLoading(false)
      }
    },
    [timeMode, activeMembers.length]
  )

  // Fetch when date, filters, or time mode change
  useEffect(() => {
    fetchVisits(currentDate, selectedMemberIds)
  }, [currentDate, selectedMemberIds, fetchVisits, timeMode])

  // Scroll to business start hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollToHour = Math.max(dayStartHour, dayStartHour)
      const offset = (scrollToHour - dayStartHour) * HOUR_HEIGHT
      scrollRef.current.scrollTop = Math.max(offset - 20, 0)
    }
  }, [dayStartHour])

  // Current time indicator
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)
  useEffect(() => {
    function updateTime() {
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const offset = nowMinutes - dayStartHour * 60
      if (offset >= 0 && offset <= dayTotalHours * 60) {
        setCurrentTimeTop((offset / 60) * HOUR_HEIGHT)
      } else {
        setCurrentTimeTop(null)
      }
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [dayStartHour, dayTotalHours])

  // ── Navigation ────────────────────────────────────────────────────────────

  function goToToday() {
    setCurrentDate(new Date())
  }

  function goBack() {
    if (timeMode === "week") {
      setCurrentDate((d) => subWeeks(d, 1))
    } else {
      setCurrentDate((d) => subDays(d, 1))
    }
  }

  function goForward() {
    if (timeMode === "week") {
      setCurrentDate((d) => addWeeks(d, 1))
    } else {
      setCurrentDate((d) => addDays(d, 1))
    }
  }

  // Item #14: Click a day in week view to jump to day view
  function handleDayClick(date: Date) {
    setCurrentDate(date)
    setTimeMode("day")
  }

  // ── Filter toggle ─────────────────────────────────────────────────────────

  // Item #4: Toggle works by removing/adding from the full set
  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  function selectAllMembers() {
    setSelectedMemberIds(activeMembers.map((m) => m.id))
  }

  function clearAllMembers() {
    // Select none would show nothing -- instead, reset to all
    setSelectedMemberIds(activeMembers.map((m) => m.id))
  }

  // ── Visit click ───────────────────────────────────────────────────────────

  function handleVisitClick(visit: CalendarVisit) {
    router.push(`/jobs/${visit.job.id}`)
  }

  // ── Drag and Drop handlers ────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, visitId: string) {
    e.dataTransfer.setData(DRAG_DATA_TYPE, visitId)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, slotKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverSlot(slotKey)
  }

  function handleDragLeave() {
    setDragOverSlot(null)
  }

  // Item #2: Fixed drop handler -- now also reassigns to target team member
  // Item #3: Uses 30-min snap
  async function handleDrop(e: React.DragEvent, hour: number, memberId?: string) {
    e.preventDefault()
    setDragOverSlot(null)

    const visitId = e.dataTransfer.getData(DRAG_DATA_TYPE)
    if (!visitId) return

    // Calculate exact drop time with 30-min snap (item #3)
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top
    const minuteOffset = Math.floor((yOffset / HOUR_HEIGHT) * 60)
    const snappedMinutes = Math.floor(minuteOffset / SNAP_INCREMENT) * SNAP_INCREMENT
    const totalMinutes = hour * 60 + snappedMinutes

    const dateStr = format(currentDate, "yyyy-MM-dd")
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    const newStart = new Date(`${dateStr}T${timeStr}:00`)

    // Find the visit
    const allVisits = [...visits, ...unscheduledVisits, ...anytimeVisits]
    const visit = allVisits.find((v) => v.id === visitId)

    // Determine duration
    let durationMinutes = 60
    if (visit?.scheduledStart && visit?.scheduledEnd) {
      durationMinutes = Math.max(
        differenceInMinutes(parseISO(visit.scheduledEnd), parseISO(visit.scheduledStart)),
        30
      )
    }
    const newEnd = addMinutes(newStart, durationMinutes)

    try {
      // Reschedule the visit
      const result = await rescheduleVisit(visitId, newStart.toISOString(), newEnd.toISOString())
      if ("error" in result) {
        toast.error(result.error as string)
        return
      }

      // Item #2: Also reassign if dropped on a specific team member's column
      if (memberId && memberId !== "unassigned") {
        await assignVisit(visitId, [memberId])
      }

      toast.success("Visit rescheduled")
      setUnscheduledVisits((prev) => prev.filter((v) => v.id !== visitId))
      setAnytimeVisits((prev) => prev.filter((v) => v.id !== visitId))
      await fetchVisits(currentDate, selectedMemberIds)
    } catch {
      toast.error("Failed to reschedule visit")
    }
  }

  // Item #20-26: Week view drop handler
  async function handleWeekDrop(visitId: string, targetDate: Date, targetMemberId?: string) {
    const allVisits = [...visits, ...anytimeVisits, ...unscheduledVisits]
    const visit = allVisits.find((v) => v.id === visitId)
    if (!visit) return

    const oldDate = visit.scheduledStart ? parseISO(visit.scheduledStart) : null
    const isDateChange = !oldDate || !isSameDay(oldDate, targetDate)

    // Determine current assignment
    const currentMemberId = visit.assignments.length > 0 ? visit.assignments[0].user.id : undefined
    const isPersonChange = targetMemberId !== currentMemberId

    // Item #24: Person-only change -- no customer notification needed
    if (!isDateChange && isPersonChange && targetMemberId) {
      try {
        await assignVisit(visitId, [targetMemberId])
        toast.success("Visit reassigned")
        await fetchVisits(currentDate, selectedMemberIds)
      } catch {
        toast.error("Failed to reassign visit")
      }
      return
    }

    // Item #21: Keep original time when moved to different day
    if (isDateChange) {
      const oldMemberName = visit.assignments.length > 0
        ? `${visit.assignments[0].user.firstName} ${visit.assignments[0].user.lastName}`
        : undefined
      const targetMember = activeMembers.find((m) => m.id === targetMemberId)
      const newMemberName = targetMember
        ? `${targetMember.firstName} ${targetMember.lastName}`
        : undefined

      // Item #25: Show confirmation popup with details
      setPendingMove({
        visitId,
        visit,
        oldDate: oldDate?.toISOString() || new Date().toISOString(),
        newDate: targetDate.toISOString(),
        oldMemberId: currentMemberId,
        newMemberId: targetMemberId,
        oldMemberName,
        newMemberName,
        isDateChange,
        isPersonChange,
      })
      return
    }

    // Same day, same person -- nothing to do
    if (!isDateChange && !isPersonChange) {
      return
    }
  }

  // Item #25, #26: Handle move confirmation
  async function handleMoveConfirm(sendNotification: boolean) {
    if (!pendingMove) return

    const { visitId, visit, newDate, newMemberId, isPersonChange } = pendingMove
    const targetDate = parseISO(newDate)

    try {
      // Build new start/end preserving original time (item #21)
      let newStart: Date
      let newEnd: Date | null = null

      if (visit.scheduledStart) {
        const oldStart = parseISO(visit.scheduledStart)
        newStart = new Date(targetDate)
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0)

        if (visit.scheduledEnd) {
          const oldEnd = parseISO(visit.scheduledEnd)
          const duration = differenceInMinutes(oldEnd, oldStart)
          newEnd = addMinutes(newStart, duration)
        }
      } else {
        newStart = startOfDay(targetDate)
      }

      // Item #26: Reschedule with notification control
      const result = await rescheduleVisit(
        visitId,
        newStart.toISOString(),
        newEnd?.toISOString() || null,
        { skipNotification: !sendNotification }
      )

      if ("error" in result) {
        toast.error(result.error as string)
        setPendingMove(null)
        return
      }

      // Reassign if person changed
      if (isPersonChange && newMemberId) {
        await assignVisit(visitId, [newMemberId])
      }

      toast.success(sendNotification ? "Visit moved and customer notified" : "Visit moved")
      await fetchVisits(currentDate, selectedMemberIds)
    } catch {
      toast.error("Failed to move visit")
    } finally {
      setPendingMove(null)
    }
  }

  function handleMoveCancel() {
    setPendingMove(null)
  }

  // ── Group visits by tech for day view ─────────────────────────────────────

  const visitsByMember = useMemo(() => {
    const useMultiColumn = displayMembers.length > 1
    if (!useMultiColumn) {
      return {
        all: visits.filter(
          (v) => v.scheduledStart && isSameDay(parseISO(v.scheduledStart), currentDate)
        ),
      }
    }

    const map: Record<string, CalendarVisit[]> = {}
    for (const member of displayMembers) {
      map[member.id] = []
    }
    map["unassigned"] = []

    const dayVisits = visits.filter(
      (v) => v.scheduledStart && isSameDay(parseISO(v.scheduledStart), currentDate)
    )

    for (const visit of dayVisits) {
      if (visit.assignments.length === 0) {
        map["unassigned"].push(visit)
      } else {
        for (const assignment of visit.assignments) {
          if (map[assignment.user.id]) {
            map[assignment.user.id].push(visit)
          }
        }
      }
    }

    return map
  }, [visits, currentDate, displayMembers])

  // ── Group anytime visits by member for column alignment (item #7) ──────────

  const anytimeByMember = useMemo(() => {
    const map: Record<string, CalendarVisit[]> = {}
    for (const member of displayMembers) {
      map[member.id] = []
    }
    map["unassigned"] = []

    for (const visit of anytimeVisits) {
      if (visit.assignments.length === 0) {
        map["unassigned"].push(visit)
      } else {
        for (const assignment of visit.assignments) {
          if (map[assignment.user.id]) {
            map[assignment.user.id].push(visit)
          }
        }
      }
    }

    return map
  }, [anytimeVisits, displayMembers])

  // ── Columns config ────────────────────────────────────────────────────────

  const useMultiColumn = displayMembers.length > 1

  const columns = useMemo(() => {
    if (!useMultiColumn) {
      return [
        {
          key: "all",
          label: format(currentDate, "EEEE, MMMM d"),
          color: "#635BFF",
          visits: visitsByMember["all"] || [],
        },
      ]
    }
    const cols = displayMembers.map((m) => ({
      key: m.id,
      label: `${m.firstName} ${m.lastName}`,
      color: m.color || "#635BFF",
      visits: visitsByMember[m.id] || [],
    }))

    const unassigned = visitsByMember["unassigned"] || []
    if (unassigned.length > 0) {
      cols.push({
        key: "unassigned",
        label: "Unassigned",
        color: "#8898AA",
        visits: unassigned,
      })
    }

    return cols
  }, [useMultiColumn, displayMembers, visitsByMember, currentDate])

  const colCount = columns.length
  const dateKey = format(currentDate, "yyyy-MM-dd")
  const todayFlag = isToday(currentDate)

  // Sort unscheduled: emergency first, then by creation date
  const sortedUnscheduled = useMemo(() => {
    return [...unscheduledVisits].sort((a, b) => {
      const aUrgent = a.job.priority === "URGENT" ? 0 : 1
      const bUrgent = b.job.priority === "URGENT" ? 0 : 1
      if (aUrgent !== bUrgent) return aUrgent - bUrgent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [unscheduledVisits])

  // Date display for header
  const dateDisplayText = useMemo(() => {
    if (timeMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    }
    return format(currentDate, "EEEE, MMMM d, yyyy")
  }, [currentDate, timeMode])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 border-[#E3E8EE] text-[#0A2540] text-xs font-medium"
          >
            Today
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={goBack}
              className="text-[#8898AA] hover:text-[#0A2540]"
              aria-label={timeMode === "week" ? "Previous week" : "Previous day"}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={goForward}
              className="text-[#8898AA] hover:text-[#0A2540]"
              aria-label={timeMode === "week" ? "Next week" : "Next day"}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Date picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button className="text-base font-semibold text-[#0A2540] ml-1 hover:text-[#635BFF] transition-colors">
                {dateDisplayText}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(date)
                    setDatePickerOpen(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {loading && (
            <Loader2 className="w-4 h-4 text-[#8898AA] animate-spin ml-2" />
          )}
        </div>

        {/* Right: Filters + view toggles */}
        <div className="flex items-center gap-2">
          {/* Team member filter (item #4: all checked by default) */}
          {activeMembers.length > 1 && (
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 border-[#E3E8EE] text-xs",
                    selectedMemberIds.length < activeMembers.length && "border-[#635BFF] text-[#635BFF]"
                  )}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Team
                  {selectedMemberIds.length < activeMembers.length && (
                    <span className="ml-1 bg-[#635BFF] text-white text-[10px] rounded-full w-4 h-4 inline-flex items-center justify-center">
                      {selectedMemberIds.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  {activeMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F6F8FA] transition-colors text-left"
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                        className="pointer-events-none"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: member.color || "#635BFF" }}
                      />
                      <span className="text-xs text-[#0A2540] truncate">
                        {member.firstName} {member.lastName}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedMemberIds.length < activeMembers.length && (
                  <button
                    onClick={selectAllMembers}
                    className="w-full mt-2 pt-2 border-t border-[#E3E8EE] text-center text-xs text-[#635BFF] hover:text-[#5851ea] transition-colors"
                  >
                    Select all
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Item #15: Horizontal/Vertical toggle */}
          <div className="flex items-center bg-[#F6F8FA] rounded-md border border-[#E3E8EE] p-0.5">
            <button
              onClick={() => setOrientation("vertical")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all",
                orientation === "vertical"
                  ? "bg-white text-[#0A2540] shadow-sm"
                  : "text-[#8898AA] hover:text-[#425466]"
              )}
              title="Vertical: team members as columns"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOrientation("horizontal")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all",
                orientation === "horizontal"
                  ? "bg-white text-[#0A2540] shadow-sm"
                  : "text-[#8898AA] hover:text-[#425466]"
              )}
              title="Horizontal: team members as rows"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Item #8: Day/Week toggle (replaces Day/List) */}
          <div className="flex items-center bg-[#F6F8FA] rounded-md border border-[#E3E8EE] p-0.5">
            <button
              onClick={() => setTimeMode("day")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all",
                timeMode === "day"
                  ? "bg-white text-[#0A2540] shadow-sm"
                  : "text-[#8898AA] hover:text-[#425466]"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Day</span>
            </button>
            <button
              onClick={() => setTimeMode("week")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all",
                timeMode === "week"
                  ? "bg-white text-[#0A2540] shadow-sm"
                  : "text-[#8898AA] hover:text-[#425466]"
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 gap-0">
        <div
          className={cn(
            "flex-1 min-w-0",
            loading && "opacity-60 pointer-events-none transition-opacity"
          )}
        >
          {timeMode === "day" ? (
            <DayTimeGrid
              columns={columns}
              colCount={colCount}
              hours={hours}
              currentDate={currentDate}
              dateKey={dateKey}
              todayFlag={todayFlag}
              useMultiColumn={useMultiColumn}
              currentTimeTop={currentTimeTop}
              scrollRef={scrollRef}
              anytimeVisits={anytimeVisits}
              anytimeByMember={anytimeByMember}
              dragOverSlot={dragOverSlot}
              dayStartHour={dayStartHour}
              dayEndHour={dayEndHour}
              businessHours={businessHours}
              orientation={orientation}
              onVisitClick={handleVisitClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ) : (
            <WeekGrid
              visits={visits}
              anytimeVisits={anytimeVisits}
              teamMembers={displayMembers}
              currentDate={currentDate}
              orientation={orientation}
              businessHours={businessHours}
              onDayClick={handleDayClick}
              onVisitClick={handleVisitClick}
              onWeekDrop={handleWeekDrop}
            />
          )}
        </div>

        {/* Unscheduled sidebar */}
        <UnscheduledSidebarV2
          visits={sortedUnscheduled}
          onVisitClick={handleVisitClick}
          onDragStart={handleDragStart}
        />
      </div>

      {/* Item #25: Move confirmation dialog */}
      <MoveConfirmationDialog
        move={pendingMove}
        onConfirm={handleMoveConfirm}
        onCancel={handleMoveCancel}
      />
    </div>
  )
}

// ── Day Time Grid Sub-component ─────────────────────────────────────────────

interface DayTimeGridProps {
  columns: { key: string; label: string; color: string; visits: CalendarVisit[] }[]
  colCount: number
  hours: number[]
  currentDate: Date
  dateKey: string
  todayFlag: boolean
  useMultiColumn: boolean
  currentTimeTop: number | null
  scrollRef: React.RefObject<HTMLDivElement | null>
  anytimeVisits: CalendarVisit[]
  anytimeByMember: Record<string, CalendarVisit[]>
  dragOverSlot: string | null
  dayStartHour: number
  dayEndHour: number
  businessHours: BusinessHours
  orientation: OrientationMode
  onVisitClick: (visit: CalendarVisit) => void
  onDragStart: (e: React.DragEvent, visitId: string) => void
  onDragOver: (e: React.DragEvent, slotKey: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, hour: number, memberId?: string) => void
}

function DayTimeGrid({
  columns,
  colCount,
  hours,
  currentDate,
  dateKey,
  todayFlag,
  useMultiColumn,
  currentTimeTop,
  scrollRef,
  anytimeVisits,
  anytimeByMember,
  dragOverSlot,
  dayStartHour,
  dayEndHour,
  businessHours,
  orientation,
  onVisitClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: DayTimeGridProps) {
  // Get business hours for the current day
  const currentDayKey = DAY_KEYS[currentDate.getDay()]
  const dayBizHours = businessHours[currentDayKey]
  const bizStartHour = dayBizHours ? parseInt(dayBizHours.start.split(":")[0], 10) : dayStartHour
  const bizEndHour = dayBizHours ? parseInt(dayBizHours.end.split(":")[0], 10) : dayEndHour

  // ── Vertical orientation: team members as columns ──────────────────────────

  if (orientation === "vertical") {
    return (
      <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
        {/* Item #6: Anytime band -- always visible, even when empty */}
        <div
          className="border-b-2 border-dashed border-[#E3E8EE] bg-[#F9FAFB]"
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
          }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
          >
            <div className="px-2 py-2 border-r border-[#E3E8EE]">
              <p className="text-[10px] font-semibold uppercase text-[#8898AA]">
                Anytime
              </p>
            </div>
            {/* Item #7: Anytime cards aligned to team member columns */}
            {columns.map((col) => {
              const memberAnytime = useMultiColumn
                ? (anytimeByMember[col.key] || [])
                : anytimeVisits
              return (
                <div
                  key={col.key}
                  className="px-1 py-1.5 border-r border-[#E3E8EE] last:border-r-0 min-h-[36px]"
                >
                  {memberAnytime.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {memberAnytime.map((visit) => {
                        const color = getVisitColor(visit)
                        const isEmergency = visit.job.priority === "URGENT"
                        return (
                          <button
                            key={visit.id}
                            onClick={() => onVisitClick(visit)}
                            draggable
                            onDragStart={(e) => onDragStart(e, visit.id)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-[#D1D5DB] bg-white hover:border-[#635BFF]/40 hover:shadow-sm transition-all cursor-pointer text-[11px]"
                          >
                            {isEmergency && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            )}
                            <VisitStatusIcon status={visit.status} />
                            <span className="font-medium text-[#0A2540] truncate max-w-[100px]">
                              {visit.job.customer.firstName} {visit.job.customer.lastName}
                            </span>
                            <span className="text-[#8898AA] truncate max-w-[80px]">
                              {getPurposeLabel(visit.purpose)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[10px] text-[#D1D5DB]">--</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Column headers */}
        <div
          className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]"
          // Item #1: Use scrollbar-gutter to prevent misalignment
          style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
        >
          <div className="border-r border-[#E3E8EE] py-3 px-2">
            <p className="text-[10px] font-semibold uppercase text-[#8898AA]">
              {format(currentDate, "EEE")}
            </p>
            <p
              className={cn(
                "text-lg font-semibold",
                todayFlag ? "text-[#635BFF]" : "text-[#0A2540]"
              )}
            >
              {format(currentDate, "d")}
            </p>
          </div>
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-2 px-3 py-3 border-r border-[#E3E8EE] last:border-r-0"
            >
              {useMultiColumn && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
              )}
              <span className="text-sm font-medium text-[#0A2540] truncate">
                {col.label}
              </span>
              <span className="text-[10px] text-[#8898AA]">
                ({col.visits.length})
              </span>
            </div>
          ))}
        </div>

        {/* Time grid -- Item #1: scrollbar-gutter: stable prevents misalignment */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 340px)", scrollbarGutter: "stable" }}
        >
          <div
            className="relative grid"
            style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
          >
            {/* Time labels */}
            <div className="border-r border-[#E3E8EE]">
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="relative border-b border-[#E3E8EE]"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {/* Item #5: Hide the first hour label to prevent clipping */}
                  {index > 0 && (
                    <span className="absolute -top-2.5 right-2 text-[10px] text-[#8898AA] font-medium">
                      {format(setMinutes(setHours(new Date(), hour), 0), "h a")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Column(s) */}
            {columns.map((col) => {
              const overlapLayout = computeVisitOverlapLayout(col.visits)

              return (
                <div
                  key={col.key}
                  className={cn(
                    "relative border-r border-[#E3E8EE] last:border-r-0",
                    todayFlag && "bg-[#635BFF]/[0.02]"
                  )}
                >
                  {/* Hour cells (droppable) */}
                  {hours.map((hour) => {
                    const slotKey = `${dateKey}-${col.key}-${hour}`
                    const isOver = dragOverSlot === slotKey
                    // Item #29: Off-hours shading
                    const isOffHours = hour < bizStartHour || hour >= bizEndHour

                    return (
                      <div
                        key={hour}
                        className={cn(
                          "border-b border-[#E3E8EE] transition-colors",
                          isOver && "bg-[#635BFF]/10",
                          isOffHours && !isOver && "bg-[#F6F8FA]/60"
                        )}
                        style={{ height: HOUR_HEIGHT }}
                        onDragOver={(e) => onDragOver(e, slotKey)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) =>
                          onDrop(e, hour, useMultiColumn ? col.key : undefined)
                        }
                      />
                    )
                  })}

                  {/* Current time indicator */}
                  {todayFlag && currentTimeTop !== null && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: currentTimeTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Visit blocks */}
                  {col.visits.map((visit) => {
                    const { top, height } = getVisitPosition(visit, dayStartHour)
                    const color = getVisitColor(visit)
                    const isEmergency = visit.job.priority === "URGENT"
                    const layout = overlapLayout.get(visit.id)
                    const colIndex = layout?.colIndex ?? 0
                    const totalCols = layout?.totalCols ?? 1

                    return (
                      <div
                        key={visit.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, visit.id)}
                        className="absolute z-10 rounded-md text-left overflow-hidden transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing"
                        style={{
                          top,
                          height: Math.max(height, 28),
                          left: `calc(${(colIndex / totalCols) * 100}% + 4px)`,
                          width: `calc(${(1 / totalCols) * 100}% - 8px)`,
                          backgroundColor: `${color}18`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onVisitClick(visit)
                          }}
                          className="w-full h-full px-2 py-1 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1">
                            {isEmergency && (
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            )}
                            <VisitStatusIcon status={visit.status} />
                            <p className="text-xs font-semibold text-[#0A2540] truncate leading-tight">
                              {visit.job.customer.firstName}{" "}
                              {visit.job.customer.lastName}
                            </p>
                          </div>
                          {height >= 44 && (
                            <p className="text-[11px] text-[#425466] truncate leading-tight mt-0.5">
                              {visit.scheduledStart &&
                                format(parseISO(visit.scheduledStart), "h:mm a")}
                              {visit.scheduledEnd &&
                                ` - ${format(parseISO(visit.scheduledEnd), "h:mm a")}`}
                            </p>
                          )}
                          {height >= 62 && (
                            <p className="text-[11px] text-[#8898AA] truncate leading-tight mt-0.5">
                              {getPurposeLabel(visit.purpose)} -- {visit.job.title}
                            </p>
                          )}
                          {height >= 80 && visit.assignments.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-[10px] text-[#8898AA] truncate">
                                {visit.assignments[0].user.firstName}{" "}
                                {visit.assignments[0].user.lastName}
                              </span>
                            </div>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Horizontal orientation: hours as columns, team members as rows ────────

  return (
    <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
      {/* Item #6: Anytime row -- always visible */}
      <div className="border-b-2 border-dashed border-[#E3E8EE] bg-[#F9FAFB]">
        <div
          className="grid"
          style={{ gridTemplateColumns: `140px 1fr` }}
        >
          <div className="px-3 py-2 border-r border-[#E3E8EE]">
            <p className="text-[10px] font-semibold uppercase text-[#8898AA]">Anytime</p>
          </div>
          <div className="px-2 py-1.5 flex flex-wrap gap-1 min-h-[36px]">
            {anytimeVisits.length > 0 ? (
              anytimeVisits.map((visit) => {
                const color = getVisitColor(visit)
                return (
                  <button
                    key={visit.id}
                    onClick={() => onVisitClick(visit)}
                    draggable
                    onDragStart={(e) => onDragStart(e, visit.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-[#D1D5DB] bg-white hover:border-[#635BFF]/40 hover:shadow-sm transition-all cursor-pointer text-[11px]"
                  >
                    <VisitStatusIcon status={visit.status} />
                    <span className="font-medium text-[#0A2540] truncate max-w-[100px]">
                      {visit.job.customer.firstName} {visit.job.customer.lastName}
                    </span>
                    {visit.assignments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[#8898AA]">{visit.assignments[0].user.firstName}</span>
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <span className="text-[10px] text-[#D1D5DB] self-center">No anytime visits</span>
            )}
          </div>
        </div>
      </div>

      {/* Header: time labels across the top */}
      <div
        className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]"
        style={{ gridTemplateColumns: `140px repeat(${hours.length}, 1fr)` }}
      >
        <div className="border-r border-[#E3E8EE] py-3 px-3">
          <p className="text-[10px] font-semibold uppercase text-[#8898AA]">
            {format(currentDate, "EEE")}
          </p>
          <p className={cn("text-lg font-semibold", todayFlag ? "text-[#635BFF]" : "text-[#0A2540]")}>
            {format(currentDate, "d")}
          </p>
        </div>
        {hours.map((hour, index) => (
          <div key={hour} className="px-1 py-3 border-r border-[#E3E8EE] last:border-r-0 text-center">
            {/* Item #5: hide first hour label */}
            {index > 0 && (
              <span className="text-[10px] text-[#8898AA] font-medium">
                {format(setMinutes(setHours(new Date(), hour), 0), "h a")}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Team member rows */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 340px)", scrollbarGutter: "stable" }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className="grid"
            style={{ gridTemplateColumns: `140px repeat(${hours.length}, 1fr)` }}
          >
            {/* Member label */}
            <div className="flex items-center gap-2 px-3 py-2 border-r border-b border-[#E3E8EE] bg-[#F6F8FA]">
              {useMultiColumn && (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              )}
              <span className="text-sm font-medium text-[#0A2540] truncate">{col.label}</span>
              <span className="text-[10px] text-[#8898AA]">({col.visits.length})</span>
            </div>

            {/* Hour cells */}
            {hours.map((hour) => {
              const slotKey = `${dateKey}-${col.key}-${hour}`
              const isOver = dragOverSlot === slotKey
              const isOffHours = hour < bizStartHour || hour >= bizEndHour

              // Find visits in this hour for this member
              const hourVisits = col.visits.filter((v) => {
                if (!v.scheduledStart) return false
                const h = parseISO(v.scheduledStart).getHours()
                return h === hour
              })

              return (
                <div
                  key={hour}
                  className={cn(
                    "relative border-r border-b border-[#E3E8EE] last:border-r-0 min-h-[64px] p-0.5 transition-colors",
                    isOver && "bg-[#635BFF]/10",
                    isOffHours && !isOver && "bg-[#F6F8FA]/60"
                  )}
                  onDragOver={(e) => onDragOver(e, slotKey)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, hour, useMultiColumn ? col.key : undefined)}
                >
                  {hourVisits.map((visit) => {
                    const color = getVisitColor(visit)
                    return (
                      <button
                        key={visit.id}
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); onDragStart(e, visit.id) }}
                        onClick={(e) => { e.stopPropagation(); onVisitClick(visit) }}
                        className="w-full text-left px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:shadow-sm"
                        style={{
                          backgroundColor: `${color}18`,
                          borderLeft: `2px solid ${color}`,
                        }}
                      >
                        {visit.job.customer.firstName} {visit.job.customer.lastName}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Unscheduled Sidebar V2 ──────────────────────────────────────────────────

interface UnscheduledSidebarV2Props {
  visits: CalendarVisit[]
  onVisitClick: (visit: CalendarVisit) => void
  onDragStart: (e: React.DragEvent, visitId: string) => void
}

function UnscheduledSidebarV2({
  visits,
  onVisitClick,
  onDragStart,
}: UnscheduledSidebarV2Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "shrink-0 border-l border-[#E3E8EE] bg-white transition-all duration-200 hidden lg:flex flex-col",
        collapsed ? "w-10" : "w-[280px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#E3E8EE] bg-[#F6F8FA]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0A2540]">
              Unscheduled
            </h3>
            {visits.length > 0 && (
              <span className="text-[10px] font-medium text-white bg-[#635BFF] rounded-full w-5 h-5 flex items-center justify-center">
                {visits.length}
              </span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#8898AA] hover:text-[#0A2540]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {!collapsed && (
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-2 space-y-2">
            {visits.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="w-8 h-8 text-[#E3E8EE] mx-auto mb-2" />
                <p className="text-xs text-[#8898AA]">
                  No unscheduled visits
                </p>
                <p className="text-[10px] text-[#8898AA] mt-1">
                  Drag visits here to unschedule them
                </p>
              </div>
            ) : (
              visits.map((visit) => {
                const isEmergency = visit.job.priority === "URGENT"
                const durationStr =
                  visit.scheduledStart && visit.scheduledEnd
                    ? `${differenceInMinutes(parseISO(visit.scheduledEnd), parseISO(visit.scheduledStart))} min`
                    : "1 hr (est.)"

                return (
                  <div
                    key={visit.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, visit.id)}
                    onClick={() => onVisitClick(visit)}
                    className="w-full text-left rounded-lg border border-[#E3E8EE] p-3 hover:border-[#635BFF]/40 hover:shadow-sm transition-all group cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-[#8898AA] mt-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            {isEmergency && (
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            )}
                            <p className="text-sm font-medium text-[#0A2540] group-hover:text-[#635BFF] truncate leading-tight">
                              {visit.job.customer.firstName}{" "}
                              {visit.job.customer.lastName}
                            </p>
                          </div>
                          <p className="text-xs text-[#425466] mt-0.5 truncate">
                            {getPurposeLabel(visit.purpose)} --{" "}
                            {visit.job.title}
                          </p>
                        </div>
                      </div>
                      {isEmergency && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 shrink-0 bg-red-50 text-red-600 border-red-200"
                        >
                          Emergency
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 pl-5">
                      <span className="text-[10px] text-[#8898AA]">
                        {visit.job.jobNumber}
                      </span>
                      <span className="text-[10px] text-[#8898AA]">
                        {durationStr}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

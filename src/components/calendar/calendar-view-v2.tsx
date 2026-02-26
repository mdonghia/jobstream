"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  format,
  parseISO,
  addDays,
  subDays,
  differenceInMinutes,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  addMinutes,
  startOfDay,
  endOfDay,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Users,
  Loader2,
  Car,
  Wrench,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  GripVertical,
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
import { getCalendarVisits, rescheduleVisit } from "@/actions/visits"
import { toast } from "sonner"

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_START_HOUR = 6
const DAY_END_HOUR = 20
const DAY_TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR
const HOUR_HEIGHT = 64 // px per hour

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarVisit {
  id: string
  visitNumber: number
  purpose: "DIAGNOSTIC" | "SERVICE" | "FOLLOW_UP" | "MAINTENANCE"
  status: "UNSCHEDULED" | "ANYTIME" | "SCHEDULED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  scheduledStart: string | null
  scheduledEnd: string | null
  arrivalWindowMinutes: number | null
  notes: string | null
  createdAt: string
  job: {
    id: string
    title: string
    jobNumber: string
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    customer: {
      id: string
      firstName: string
      lastName: string
    }
  }
  assignments: {
    user: {
      id: string
      firstName: string
      lastName: string
      color: string | null
    }
  }[]
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  color: string | null
  role: string
  isActive: boolean
}

type ViewMode = "day" | "list"

interface CalendarViewV2Props {
  initialVisits: CalendarVisit[]
  unscheduledVisits: CalendarVisit[]
  anytimeVisits: CalendarVisit[]
  teamMembers: TeamMember[]
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

function getPurposeLabel(purpose: string): string {
  const labels: Record<string, string> = {
    DIAGNOSTIC: "Diagnostic",
    SERVICE: "Service",
    FOLLOW_UP: "Follow-up",
    MAINTENANCE: "Maintenance",
  }
  return labels[purpose] || purpose
}

function getVisitColor(visit: CalendarVisit): string {
  if (visit.assignments.length > 0 && visit.assignments[0].user.color) {
    return visit.assignments[0].user.color
  }
  return "#635BFF"
}

// ── Visit position helpers ────────────────────────────────────────────────────

function getVisitPosition(visit: CalendarVisit) {
  if (!visit.scheduledStart) return { top: 0, height: HOUR_HEIGHT, durationMinutes: 60 }

  const start = parseISO(visit.scheduledStart)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const topMinutes = Math.max(startMinutes - DAY_START_HOUR * 60, 0)

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

// ── Overlap layout (same algorithm as v1) ─────────────────────────────────────

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

// ── Drag-and-drop helpers (HTML5) ─────────────────────────────────────────────

const DRAG_DATA_TYPE = "application/x-visit-id"

// ── Main Component ────────────────────────────────────────────────────────────

export function CalendarViewV2({
  initialVisits,
  unscheduledVisits: initialUnscheduled,
  anytimeVisits: initialAnytime,
  teamMembers,
}: CalendarViewV2Props) {
  const router = useRouter()

  const [view, setView] = useState<ViewMode>("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [visits, setVisits] = useState<CalendarVisit[]>(initialVisits)
  const [unscheduledVisits, setUnscheduledVisits] = useState<CalendarVisit[]>(initialUnscheduled)
  const [anytimeVisits, setAnytimeVisits] = useState<CalendarVisit[]>(initialAnytime)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  const activeMembers = useMemo(
    () => teamMembers.filter((m) => m.isActive),
    [teamMembers]
  )

  // Filtered members to display as columns
  const displayMembers = useMemo(() => {
    if (selectedMemberIds.length > 0) {
      return activeMembers.filter((m) => selectedMemberIds.includes(m.id))
    }
    return activeMembers
  }, [activeMembers, selectedMemberIds])

  const hours = useMemo(
    () => Array.from({ length: DAY_TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i),
    []
  )

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchVisits = useCallback(
    async (date: Date, memberIds: string[]) => {
      setLoading(true)
      try {
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)

        const [scheduledResult, unscheduledResult] = await Promise.all([
          getCalendarVisits({
            start: dayStart.toISOString(),
            end: dayEnd.toISOString(),
            userIds: memberIds.length > 0 ? memberIds : undefined,
          }),
          getCalendarVisits({
            start: new Date(0).toISOString(),
            end: new Date(0).toISOString(),
            userIds: memberIds.length > 0 ? memberIds : undefined,
          }),
        ])

        if (!("error" in scheduledResult)) {
          const allVisits = JSON.parse(JSON.stringify(scheduledResult.visits)) as CalendarVisit[]

          // Separate scheduled vs anytime
          const scheduled = allVisits.filter((v) => v.status === "SCHEDULED" || v.status === "EN_ROUTE" || v.status === "IN_PROGRESS" || v.status === "COMPLETED" || v.status === "CANCELLED")
          const anytime = allVisits.filter((v) => v.status === "ANYTIME")

          setVisits(scheduled)
          setAnytimeVisits(anytime)
        } else {
          toast.error(scheduledResult.error as string)
        }

        // Unscheduled visits don't have date ranges -- fetch separately
        // The server action filters by scheduledStart range, so for unscheduled we
        // need a different approach. We'll keep the initial set and only refresh
        // if a reschedule happens.
      } catch {
        toast.error("Failed to load calendar visits")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Fetch when date or filters change
  useEffect(() => {
    fetchVisits(currentDate, selectedMemberIds)
  }, [currentDate, selectedMemberIds, fetchVisits])

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const offset8am = (8 - DAY_START_HOUR) * HOUR_HEIGHT
      scrollRef.current.scrollTop = offset8am - 20
    }
  }, [])

  // Current time indicator
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)
  useEffect(() => {
    function updateTime() {
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const offset = nowMinutes - DAY_START_HOUR * 60
      if (offset >= 0 && offset <= DAY_TOTAL_HOURS * 60) {
        setCurrentTimeTop((offset / 60) * HOUR_HEIGHT)
      } else {
        setCurrentTimeTop(null)
      }
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────

  function goToToday() {
    setCurrentDate(new Date())
  }

  function goBack() {
    setCurrentDate((d) => subDays(d, 1))
  }

  function goForward() {
    setCurrentDate((d) => addDays(d, 1))
  }

  // ── Filter toggle ─────────────────────────────────────────────────────────

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  function clearFilters() {
    setSelectedMemberIds([])
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

  async function handleDrop(e: React.DragEvent, hour: number, memberId?: string) {
    e.preventDefault()
    setDragOverSlot(null)

    const visitId = e.dataTransfer.getData(DRAG_DATA_TYPE)
    if (!visitId) return

    // Calculate exact drop time from mouse position within the hour cell
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top
    const minuteOffset = Math.floor((yOffset / HOUR_HEIGHT) * 60)
    const snappedMinutes = Math.floor(minuteOffset / 15) * 15
    const totalMinutes = hour * 60 + snappedMinutes

    const dateStr = format(currentDate, "yyyy-MM-dd")
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`

    const newStart = new Date(`${dateStr}T${timeStr}:00`)

    // Find the visit -- it could be in scheduled, unscheduled, or anytime lists
    const allVisits = [...visits, ...unscheduledVisits, ...anytimeVisits]
    const visit = allVisits.find((v) => v.id === visitId)

    // Determine duration: keep existing or default to 1 hour
    let durationMinutes = 60
    if (visit?.scheduledStart && visit?.scheduledEnd) {
      durationMinutes = Math.max(
        differenceInMinutes(parseISO(visit.scheduledEnd), parseISO(visit.scheduledStart)),
        30
      )
    }
    const newEnd = addMinutes(newStart, durationMinutes)

    try {
      const result = await rescheduleVisit(visitId, newStart.toISOString(), newEnd.toISOString())
      if ("error" in result) {
        toast.error(result.error as string)
        return
      }

      toast.success("Visit rescheduled")

      // Remove from unscheduled if it was there
      setUnscheduledVisits((prev) => prev.filter((v) => v.id !== visitId))
      setAnytimeVisits((prev) => prev.filter((v) => v.id !== visitId))

      // Refresh data
      await fetchVisits(currentDate, selectedMemberIds)
    } catch {
      toast.error("Failed to reschedule visit")
    }
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

    // Add unassigned column if there are unassigned visits
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

  // Sort unscheduled: emergency (URGENT) first, then by creation date
  const sortedUnscheduled = useMemo(() => {
    return [...unscheduledVisits].sort((a, b) => {
      const aUrgent = a.job.priority === "URGENT" ? 0 : 1
      const bUrgent = b.job.priority === "URGENT" ? 0 : 1
      if (aUrgent !== bUrgent) return aUrgent - bUrgent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [unscheduledVisits])

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
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={goForward}
              className="text-[#8898AA] hover:text-[#0A2540]"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Date picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button className="text-base font-semibold text-[#0A2540] ml-1 hover:text-[#635BFF] transition-colors">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
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

        {/* Right: Filters + view toggle */}
        <div className="flex items-center gap-2">
          {/* Team member filter */}
          {activeMembers.length > 1 && (
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 border-[#E3E8EE] text-xs",
                    selectedMemberIds.length > 0 && "border-[#635BFF] text-[#635BFF]"
                  )}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Team
                  {selectedMemberIds.length > 0 && (
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
                {selectedMemberIds.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full mt-2 pt-2 border-t border-[#E3E8EE] text-center text-xs text-[#635BFF] hover:text-[#5851ea] transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-[#F6F8FA] rounded-md border border-[#E3E8EE] p-0.5">
            <button
              onClick={() => setView("day")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all",
                view === "day"
                  ? "bg-white text-[#0A2540] shadow-sm"
                  : "text-[#8898AA] hover:text-[#425466]"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Day</span>
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all",
                view === "list"
                  ? "bg-white text-[#0A2540] shadow-sm"
                  : "text-[#8898AA] hover:text-[#425466]"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content area: calendar + unscheduled sidebar */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Calendar area */}
        <div
          className={cn(
            "flex-1 min-w-0",
            loading && "opacity-60 pointer-events-none transition-opacity"
          )}
        >
          {view === "day" ? (
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
              dragOverSlot={dragOverSlot}
              onVisitClick={handleVisitClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ) : (
            <VisitListView
              visits={visits}
              anytimeVisits={anytimeVisits}
              currentDate={currentDate}
              onVisitClick={handleVisitClick}
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
  dragOverSlot: string | null
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
  dragOverSlot,
  onVisitClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: DayTimeGridProps) {
  return (
    <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
      {/* Anytime band */}
      {anytimeVisits.length > 0 && (
        <div className="border-b-2 border-dashed border-[#E3E8EE] bg-[#F9FAFB] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-[#8898AA] mb-1.5">
            Anytime Today
          </p>
          <div className="flex flex-wrap gap-2">
            {anytimeVisits.map((visit) => {
              const color = getVisitColor(visit)
              const isEmergency = visit.job.priority === "URGENT"
              return (
                <button
                  key={visit.id}
                  onClick={() => onVisitClick(visit)}
                  draggable
                  onDragStart={(e) => onDragStart(e, visit.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-dashed border-[#D1D5DB] bg-white hover:border-[#635BFF]/40 hover:shadow-sm transition-all cursor-pointer"
                >
                  {isEmergency && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                  <VisitStatusIcon status={visit.status} />
                  <span className="text-xs font-medium text-[#0A2540] truncate max-w-[140px]">
                    {visit.job.customer.firstName} {visit.job.customer.lastName}
                  </span>
                  <span className="text-[10px] text-[#8898AA] truncate max-w-[100px]">
                    {getPurposeLabel(visit.purpose)}
                  </span>
                  {visit.assignments.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-[#8898AA] truncate">
                        {visit.assignments[0].user.firstName}
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Column headers */}
      <div
        className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]"
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

      {/* Time grid */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
        >
          {/* Time labels */}
          <div className="border-r border-[#E3E8EE]">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-[#E3E8EE]"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-[10px] text-[#8898AA] font-medium">
                  {format(setMinutes(setHours(new Date(), hour), 0), "h a")}
                </span>
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

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "border-b border-[#E3E8EE] transition-colors",
                        isOver && "bg-[#635BFF]/10"
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
                  const { top, height } = getVisitPosition(visit)
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

// ── List View Sub-component ─────────────────────────────────────────────────

interface VisitListViewProps {
  visits: CalendarVisit[]
  anytimeVisits: CalendarVisit[]
  currentDate: Date
  onVisitClick: (visit: CalendarVisit) => void
}

function VisitListView({
  visits,
  anytimeVisits,
  currentDate,
  onVisitClick,
}: VisitListViewProps) {
  // Combine scheduled + anytime and sort chronologically
  const allVisits = useMemo(() => {
    const combined = [...visits, ...anytimeVisits]
    return combined.sort((a, b) => {
      if (!a.scheduledStart) return 1
      if (!b.scheduledStart) return -1
      return (
        parseISO(a.scheduledStart).getTime() -
        parseISO(b.scheduledStart).getTime()
      )
    })
  }, [visits, anytimeVisits])

  if (allVisits.length === 0) {
    return (
      <div className="border border-[#E3E8EE] rounded-lg bg-white p-12 text-center">
        <p className="text-sm text-[#8898AA]">
          No visits scheduled for this day.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-[#E3E8EE] rounded-lg bg-white overflow-hidden divide-y divide-[#E3E8EE]">
      {/* Date header */}
      <div className="px-4 py-2.5 bg-[#F6F8FA] border-b border-[#E3E8EE]">
        <h3 className="text-sm font-semibold text-[#0A2540]">
          {format(currentDate, "EEEE, MMMM d, yyyy")}
        </h3>
        <p className="text-xs text-[#8898AA] mt-0.5">
          {allVisits.length} {allVisits.length === 1 ? "visit" : "visits"}
        </p>
      </div>

      {/* Visit items */}
      <div className="divide-y divide-[#E3E8EE]">
        {allVisits.map((visit) => {
          const color = getVisitColor(visit)
          const isEmergency = visit.job.priority === "URGENT"
          const isAnytime = visit.status === "ANYTIME"

          return (
            <div
              key={visit.id}
              className={cn(
                "flex items-start gap-4 px-4 py-3 hover:bg-[#F6F8FA]/50 transition-colors cursor-pointer",
                isAnytime && "border-l-2 border-dashed border-l-[#D1D5DB]"
              )}
              style={
                !isAnytime ? { borderLeft: `3px solid ${color}` } : undefined
              }
              onClick={() => onVisitClick(visit)}
            >
              {/* Time */}
              <div className="shrink-0 w-28">
                {isAnytime ? (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#8898AA]">
                    <Clock className="w-3.5 h-3.5" />
                    Anytime
                  </div>
                ) : visit.scheduledStart ? (
                  <>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#0A2540]">
                      <Clock className="w-3.5 h-3.5 text-[#8898AA]" />
                      {format(parseISO(visit.scheduledStart), "h:mm a")}
                    </div>
                    {visit.scheduledEnd && (
                      <p className="text-xs text-[#8898AA] ml-5 mt-0.5">
                        to {format(parseISO(visit.scheduledEnd), "h:mm a")}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-[#8898AA]">No time set</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isEmergency && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                  <VisitStatusIcon status={visit.status} />
                  <p className="text-sm font-semibold text-[#0A2540] truncate">
                    {visit.job.customer.firstName}{" "}
                    {visit.job.customer.lastName}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200"
                  >
                    {getPurposeLabel(visit.purpose)}
                  </Badge>
                  {isAnytime && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200"
                    >
                      Anytime
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#425466] mt-0.5 truncate">
                  {visit.job.title} ({visit.job.jobNumber}) -- Visit #
                  {visit.visitNumber}
                </p>
              </div>

              {/* Assigned tech */}
              <div className="shrink-0">
                {visit.assignments.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-[#425466]">
                      {visit.assignments[0].user.firstName}{" "}
                      {visit.assignments[0].user.lastName}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-[#8898AA] flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Unassigned
                  </span>
                )}
              </div>
            </div>
          )
        })}
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

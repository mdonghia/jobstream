"use client"

import { useState, useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  addMinutes,
  parseISO,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  List,
  Users,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { getCalendarJobs, rescheduleJob } from "@/actions/jobs"
import { toast } from "sonner"

import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { DayView } from "./day-view"
import { ListView } from "./list-view"
import type { CalendarJob } from "./month-view"
import type { TeamMember } from "./day-view"

// ── Types ──────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day" | "list"

interface CalendarViewProps {
  initialJobs: CalendarJob[]
  teamMembers: TeamMember[]
  /** Callback to notify parent when local jobs state changes (for conflict detection) */
  onJobsChange?: (jobs: CalendarJob[]) => void
  /** Callback to register a refetch function with the parent */
  onRefetchReady?: (refetch: () => Promise<void>) => void
  /** Callback to notify parent when active members change */
  onActiveMembersChange?: (members: TeamMember[]) => void
}

// ── View config ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: "month", label: "Month", icon: Calendar },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "day", label: "Day", icon: CalendarDays },
  { value: "list", label: "List", icon: List },
]

// ── Component ──────────────────────────────────────────────────────────────────

export function CalendarView({
  initialJobs,
  teamMembers,
  onJobsChange,
  onRefetchReady,
  onActiveMembersChange,
}: CalendarViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [view, setView] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [jobs, setJobs] = useState<CalendarJob[]>(initialJobs)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Active team members
  const activeMembers = teamMembers.filter((m) => m.isActive)

  // ── Notify parent of state changes ─────────────────────────────────────────

  useEffect(() => {
    onJobsChange?.(jobs)
  }, [jobs, onJobsChange])

  useEffect(() => {
    onActiveMembersChange?.(activeMembers)
  }, [activeMembers, onActiveMembersChange])

  // ── Date range calculation ─────────────────────────────────────────────────

  const getDateRange = useCallback(
    (d: Date, v: ViewMode) => {
      switch (v) {
        case "month": {
          const ms = startOfMonth(d)
          const me = endOfMonth(d)
          return {
            start: startOfWeek(ms, { weekStartsOn: 0 }),
            end: endOfWeek(me, { weekStartsOn: 0 }),
          }
        }
        case "week":
          return {
            start: startOfWeek(d, { weekStartsOn: 0 }),
            end: endOfWeek(d, { weekStartsOn: 0 }),
          }
        case "day":
          return { start: d, end: d }
        case "list": {
          return { start: startOfMonth(d), end: endOfMonth(d) }
        }
      }
    },
    []
  )

  // ── Fetch jobs ─────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(
    async (d: Date, v: ViewMode, memberIds: string[]) => {
      setLoading(true)
      try {
        const range = getDateRange(d, v)
        const result = await getCalendarJobs({
          start: range.start.toISOString(),
          end: range.end.toISOString(),
          userIds: memberIds.length > 0 ? memberIds : undefined,
        })
        if ("error" in result) {
          toast.error(result.error as string)
        } else {
          setJobs(
            JSON.parse(JSON.stringify(result.jobs)) as CalendarJob[]
          )
        }
      } catch {
        toast.error("Failed to load calendar jobs")
      } finally {
        setLoading(false)
      }
    },
    [getDateRange]
  )

  // Expose refetch to parent via callback
  const refetch = useCallback(async () => {
    await fetchJobs(currentDate, view, selectedMemberIds)
  }, [fetchJobs, currentDate, view, selectedMemberIds])

  useEffect(() => {
    onRefetchReady?.(refetch)
  }, [refetch, onRefetchReady])

  // Refetch when date, view, or filters change
  useEffect(() => {
    fetchJobs(currentDate, view, selectedMemberIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, view, selectedMemberIds])

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goToToday() {
    setCurrentDate(new Date())
  }

  function goBack() {
    switch (view) {
      case "month":
        setCurrentDate((d) => subMonths(d, 1))
        break
      case "week":
        setCurrentDate((d) => subWeeks(d, 1))
        break
      case "day":
        setCurrentDate((d) => subDays(d, 1))
        break
      case "list":
        setCurrentDate((d) => subMonths(d, 1))
        break
    }
  }

  function goForward() {
    switch (view) {
      case "month":
        setCurrentDate((d) => addMonths(d, 1))
        break
      case "week":
        setCurrentDate((d) => addWeeks(d, 1))
        break
      case "day":
        setCurrentDate((d) => addDays(d, 1))
        break
      case "list":
        setCurrentDate((d) => addMonths(d, 1))
        break
    }
  }

  // ── Date label ─────────────────────────────────────────────────────────────

  function getDateLabel(): string {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy")
      case "week": {
        const ws = startOfWeek(currentDate, { weekStartsOn: 0 })
        const we = endOfWeek(currentDate, { weekStartsOn: 0 })
        if (ws.getMonth() === we.getMonth()) {
          return `${format(ws, "MMMM d")} - ${format(we, "d, yyyy")}`
        }
        return `${format(ws, "MMM d")} - ${format(we, "MMM d, yyyy")}`
      }
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy")
      case "list":
        return format(currentDate, "MMMM yyyy")
    }
  }

  // ── Filter toggle ──────────────────────────────────────────────────────────

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

  // ── Slot/job click handlers ────────────────────────────────────────────────

  function handleJobClick(jobId: string) {
    router.push(`/jobs/${jobId}`)
  }

  function handleSlotClick(date: Date, time?: string) {
    const params = new URLSearchParams()
    params.set("date", date.toISOString())
    if (time) params.set("time", time)
    router.push(`/jobs/new?${params.toString()}`)
  }

  // ── Resize handler ─────────────────────────────────────────────────────────

  async function handleResize(jobId: string, newDurationMinutes: number) {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    const previousJobs = [...jobs]
    const start = parseISO(job.scheduledStart)
    const newEnd = addMinutes(start, newDurationMinutes)

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, scheduledEnd: newEnd.toISOString() }
          : j
      )
    )

    try {
      const result = await rescheduleJob(jobId, job.scheduledStart, newEnd.toISOString())
      if ("error" in result) {
        toast.error(result.error as string)
        setJobs(previousJobs)
        return
      }

      toast.success("Duration updated. Undo?", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undoResult = await rescheduleJob(
              jobId,
              job.scheduledStart,
              job.scheduledEnd || addMinutes(start, 60).toISOString()
            )
            if ("error" in undoResult) {
              toast.error("Failed to undo")
            } else {
              setJobs(previousJobs)
              toast.info("Duration change undone")
            }
          },
        },
      })
    } catch {
      toast.error("Failed to update duration")
      setJobs(previousJobs)
    }
  }

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
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={goForward}
              className="text-[#8898AA] hover:text-[#0A2540]"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="text-base font-semibold text-[#0A2540] ml-1">
            {getDateLabel()}
          </h2>
          {loading && (
            <Loader2 className="w-4 h-4 text-[#8898AA] animate-spin ml-2" />
          )}
        </div>

        {/* Right: View toggle + filters */}
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

          {/* View toggle group */}
          <div className="flex items-center bg-[#F6F8FA] rounded-md border border-[#E3E8EE] p-0.5">
            {VIEW_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = view === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setView(opt.value)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all",
                    active
                      ? "bg-white text-[#0A2540] shadow-sm"
                      : "text-[#8898AA] hover:text-[#425466]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Calendar content */}
      <div className={cn("flex-1 min-h-0", loading && "opacity-60 pointer-events-none transition-opacity")}>
        {view === "month" && (
          <MonthView
            jobs={jobs}
            currentDate={currentDate}
            onJobClick={handleJobClick}
            onSlotClick={(date) => handleSlotClick(date)}
          />
        )}
        {view === "week" && (
          <WeekView
            jobs={jobs}
            currentDate={currentDate}
            onJobClick={handleJobClick}
            onSlotClick={handleSlotClick}
            onResize={handleResize}
          />
        )}
        {view === "day" && (
          <DayView
            jobs={jobs}
            currentDate={currentDate}
            onJobClick={handleJobClick}
            onSlotClick={handleSlotClick}
            teamMembers={activeMembers}
            onResize={handleResize}
          />
        )}
        {view === "list" && (
          <ListView jobs={jobs} currentDate={currentDate} />
        )}
      </div>
    </div>
  )
}

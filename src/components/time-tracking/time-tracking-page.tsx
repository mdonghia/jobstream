"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Clock,
  Play,
  Square,
  Trash2,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarIcon,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeEntry {
  id: string
  userId: string
  userName: string
  jobId: string | null
  jobTitle: string | null
  clockIn: string
  clockOut: string | null
  durationMinutes: number | null
  notes: string | null
}

interface Job {
  id: string
  title: string
}

interface TeamMember {
  id: string
  name: string
}

interface TimeTrackingPageProps {
  initialEntries?: TimeEntry[]
  initialJobs?: Job[]
  initialTeamMembers?: TeamMember[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatMinutesToHM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatTimeOnly(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeTrackingPage({
  initialEntries = [],
  initialJobs = [],
  initialTeamMembers = [],
}: TimeTrackingPageProps) {
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [timerJobId, setTimerJobId] = useState<string>("")
  const [timerNotes, setTimerNotes] = useState("")
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Data
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries)
  const [jobs] = useState<Job[]>(initialJobs)
  const [teamMembers] = useState<TeamMember[]>(initialTeamMembers)

  // View state
  const [viewMode, setViewMode] = useState<"day" | "week" | "all">("day")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [teamMemberFilter, setTeamMemberFilter] = useState("all")
  const [allPage, setAllPage] = useState(1)
  const [allTotal, setAllTotal] = useState(0)
  const [allTotalPages, setAllTotalPages] = useState(1)

  // Add entry dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [formDate, setFormDate] = useState("")
  const [formStartTime, setFormStartTime] = useState("")
  const [formEndTime, setFormEndTime] = useState("")
  const [formJobId, setFormJobId] = useState("")
  const [formNotes, setFormNotes] = useState("")

  // Loading
  const [loading, setLoading] = useState(false)

  // Fetch entries from server action (when available)
  const fetchEntries = useCallback(async () => {
    try {
      const mod = await import("@/actions/time-entries").catch(() => null)
      if (mod?.getTimeEntries) {
        setLoading(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {}
        if (viewMode === "all") {
          params.perPage = 25
          params.page = allPage
        } else if (viewMode === "day") {
          const d = selectedDate
          params.dateFrom = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
          params.dateTo = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
          params.perPage = 500
        } else {
          const ws = startOfWeek(selectedDate, { weekStartsOn: 1 })
          const we = endOfWeek(selectedDate, { weekStartsOn: 1 })
          params.dateFrom = ws.toISOString()
          params.dateTo = we.toISOString()
          params.perPage = 500
        }
        if (teamMemberFilter !== "all") {
          params.userId = teamMemberFilter
        }
        const result = await mod.getTimeEntries(params)
        if (result && !("error" in result)) {
          setEntries((result.entries ?? []).map((e: any) => ({
            ...e,
            userName: e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown",
            jobTitle: e.job?.title ?? null,
            clockIn: e.clockIn instanceof Date ? e.clockIn.toISOString() : e.clockIn,
            clockOut: e.clockOut instanceof Date ? e.clockOut.toISOString() : e.clockOut,
          })))
          if (viewMode === "all") {
            setAllTotal(result.total ?? 0)
            setAllTotalPages(result.totalPages ?? 1)
          }
        }
        setLoading(false)
      }
    } catch {
      // Server actions not yet available
    }
  }, [selectedDate, viewMode, teamMemberFilter, allPage])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Check for active timer on mount
  useEffect(() => {
    async function checkActiveTimer() {
      try {
        const mod = await import("@/actions/time-entries").catch(() => null)
        if (mod?.getActiveTimer) {
          const result = await mod.getActiveTimer()
          if (result && !("error" in result) && result.entry) {
            setActiveEntryId(result.entry.id)
            setTimerStart(new Date(result.entry.clockIn))
            setTimerRunning(true)
            if (result.entry.jobId) setTimerJobId(result.entry.jobId)
            if (result.entry.notes) setTimerNotes(result.entry.notes)
          }
        }
      } catch {
        // Server actions not yet available
      }
    }
    checkActiveTimer()
  }, [])

  // Timer tick
  useEffect(() => {
    if (timerRunning && timerStart) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        setElapsed(Math.floor((now.getTime() - timerStart.getTime()) / 1000))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning, timerStart])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleStartTimer() {
    try {
      const mod = await import("@/actions/time-entries").catch(() => null)
      if (mod?.startTimer) {
        const result = await mod.startTimer({
          jobId: timerJobId && timerJobId !== "none" ? timerJobId : undefined,
          notes: timerNotes || undefined,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        if (result?.entry) {
          setActiveEntryId(result.entry.id)
          setTimerStart(new Date(result.entry.clockIn))
          setTimerRunning(true)
          setElapsed(0)
          return
        }
      }
      // Fallback: local-only timer
      const now = new Date()
      setTimerStart(now)
      setTimerRunning(true)
      setElapsed(0)
    } catch {
      toast.error("Failed to start timer")
    }
  }

  async function handleStopTimer() {
    if (!timerStart) return
    setTimerRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    try {
      const mod = await import("@/actions/time-entries").catch(() => null)
      // If we have an active entry ID, use stopTimer
      if (activeEntryId && mod?.stopTimer) {
        const result = await mod.stopTimer(activeEntryId)
        if (result && "error" in result) {
          toast.error(result.error as string)
        } else {
          toast.success("Time entry saved")
          fetchEntries()
        }
      } else if (mod?.createManualEntry) {
        // Fallback: create manual entry if no active entry ID
        const clockIn = timerStart
        const clockOut = new Date()
        const result = await mod.createManualEntry({
          date: format(clockIn, "yyyy-MM-dd"),
          startTime: format(clockIn, "HH:mm"),
          endTime: format(clockOut, "HH:mm"),
          jobId: timerJobId && timerJobId !== "none" ? timerJobId : undefined,
          notes: timerNotes || undefined,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
        } else {
          toast.success("Time entry saved")
          fetchEntries()
        }
      } else {
        // Mock: add local entry
        const newEntry: TimeEntry = {
          id: crypto.randomUUID(),
          userId: "current",
          userName: "You",
          jobId: timerJobId || null,
          jobTitle: jobs.find((j) => j.id === timerJobId)?.title ?? null,
          clockIn: timerStart.toISOString(),
          clockOut: new Date().toISOString(),
          durationMinutes: Math.round(elapsed / 60),
          notes: timerNotes || null,
        }
        setEntries((prev) => [newEntry, ...prev])
        toast.success("Time entry saved locally")
      }
    } catch {
      toast.error("Failed to save time entry")
    }

    // Reset timer
    setActiveEntryId(null)
    setTimerStart(null)
    setElapsed(0)
    setTimerJobId("")
    setTimerNotes("")
  }

  async function handleDiscardTimer() {
    setTimerRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Delete the server-side entry if it exists
    if (activeEntryId) {
      try {
        const mod = await import("@/actions/time-entries").catch(() => null)
        if (mod?.discardTimer) {
          await mod.discardTimer(activeEntryId)
        } else if (mod?.deleteTimeEntry) {
          await mod.deleteTimeEntry(activeEntryId)
        }
      } catch {
        // Best effort cleanup
      }
    }

    setActiveEntryId(null)
    setTimerStart(null)
    setElapsed(0)
    setTimerJobId("")
    setTimerNotes("")
    toast("Timer discarded")
  }

  function openAddDialog() {
    setEditingEntry(null)
    setFormDate(format(selectedDate, "yyyy-MM-dd"))
    setFormStartTime("09:00")
    setFormEndTime("17:00")
    setFormJobId("")
    setFormNotes("")
    setAddDialogOpen(true)
  }

  function openEditDialog(entry: TimeEntry) {
    setEditingEntry(entry)
    const clockIn = new Date(entry.clockIn)
    const clockOut = entry.clockOut ? new Date(entry.clockOut) : null
    setFormDate(format(clockIn, "yyyy-MM-dd"))
    setFormStartTime(format(clockIn, "HH:mm"))
    setFormEndTime(clockOut ? format(clockOut, "HH:mm") : "")
    setFormJobId(entry.jobId ?? "")
    setFormNotes(entry.notes ?? "")
    setAddDialogOpen(true)
  }

  async function handleSaveEntry() {
    if (!formDate || !formStartTime || !formEndTime) {
      toast.error("Please fill in date, start time, and end time")
      return
    }

    const clockIn = new Date(`${formDate}T${formStartTime}:00`)
    const clockOut = new Date(`${formDate}T${formEndTime}:00`)

    if (clockOut <= clockIn) {
      toast.error("End time must be after start time")
      return
    }

    const durationMinutes = Math.round(
      (clockOut.getTime() - clockIn.getTime()) / 60000
    )

    try {
      const mod = await import("@/actions/time-entries").catch(() => null)

      if (editingEntry && mod?.updateTimeEntry) {
        const result = await mod.updateTimeEntry(editingEntry.id, {
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          jobId: formJobId || undefined,
          notes: formNotes || undefined,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Time entry updated")
      } else if (!editingEntry && mod?.createManualEntry) {
        const result = await mod.createManualEntry({
          date: formDate,
          startTime: formStartTime,
          endTime: formEndTime,
          jobId: formJobId || undefined,
          notes: formNotes || undefined,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Time entry saved")
      } else {
        // Mock: add local entry
        const newEntry: TimeEntry = {
          id: editingEntry?.id ?? crypto.randomUUID(),
          userId: "current",
          userName: "You",
          jobId: formJobId || null,
          jobTitle: jobs.find((j) => j.id === formJobId)?.title ?? null,
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          durationMinutes,
          notes: formNotes || null,
        }
        if (editingEntry) {
          setEntries((prev) =>
            prev.map((e) => (e.id === editingEntry.id ? newEntry : e))
          )
          toast.success("Time entry updated locally")
        } else {
          setEntries((prev) => [newEntry, ...prev])
          toast.success("Time entry saved locally")
        }
      }
      setAddDialogOpen(false)
      fetchEntries()
    } catch {
      toast.error("Failed to save time entry")
    }
  }

  async function handleDeleteEntry(entryId: string) {
    try {
      const mod = await import("@/actions/time-entries").catch(() => null)
      if (mod?.deleteTimeEntry) {
        const result = await mod.deleteTimeEntry(entryId)
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Time entry deleted")
        fetchEntries()
      } else {
        setEntries((prev) => prev.filter((e) => e.id !== entryId))
        toast.success("Time entry deleted locally")
      }
    } catch {
      toast.error("Failed to delete time entry")
    }
  }

  async function handleExport() {
    try {
      const mod = await import("@/actions/time-entries").catch(() => null)
      if (mod?.exportTimeEntries) {
        let dateFrom: string
        let dateTo: string
        if (viewMode === "day") {
          const d = selectedDate
          dateFrom = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
          dateTo = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
        } else {
          const ws = startOfWeek(selectedDate, { weekStartsOn: 1 })
          const we = endOfWeek(selectedDate, { weekStartsOn: 1 })
          dateFrom = ws.toISOString()
          dateTo = we.toISOString()
        }
        const result = await mod.exportTimeEntries({ dateFrom, dateTo })
        if (!result || "error" in result || !result.entries || result.entries.length === 0) {
          toast.error("No time entries to export")
          return
        }
        const csvRows = result.entries.map((e: any) => ({
          Date: e.clockIn ? new Date(e.clockIn).toLocaleDateString() : "",
          "Team Member": e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown",
          "Clock In": e.clockIn ? new Date(e.clockIn).toLocaleTimeString() : "",
          "Clock Out": e.clockOut ? new Date(e.clockOut).toLocaleTimeString() : "Running",
          "Duration (min)": e.durationMinutes != null ? String(e.durationMinutes) : "",
          Job: e.job ? `${e.job.jobNumber} - ${e.job.title}` : "",
          Notes: e.notes ?? "",
        }))
        const headers = Object.keys(csvRows[0])
        const rows = csvRows.map((row: any) =>
          headers
            .map((h) => {
              const val = String(row[h] ?? "")
              return val.includes(",") || val.includes('"')
                ? `"${val.replace(/"/g, '""')}"`
                : val
            })
            .join(",")
        )
        const csv = [headers.join(","), ...rows].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `time-entries-export-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success("Time entries exported")
      } else {
        toast.error("No time entries to export")
      }
    } catch {
      toast.error("Failed to export")
    }
  }

  // ---------------------------------------------------------------------------
  // Filtered entries
  // ---------------------------------------------------------------------------

  const dayEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.clockIn)
    return isSameDay(entryDate, selectedDate)
  })

  const totalMinutesToday = dayEntries.reduce(
    (sum, e) => sum + (e.durationMinutes ?? 0),
    0
  )

  // Week view data
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  function getWeekDataForMember(memberId: string) {
    return weekDays.map((day) => {
      const dayMemberEntries = entries.filter((e) => {
        const entryDate = new Date(e.clockIn)
        return isSameDay(entryDate, day) && e.userId === memberId
      })
      return dayMemberEntries.reduce(
        (sum, e) => sum + (e.durationMinutes ?? 0),
        0
      )
    })
  }

  // ---------------------------------------------------------------------------
  // Date navigation
  // ---------------------------------------------------------------------------

  function navigateDate(direction: "prev" | "next") {
    if (viewMode === "day") {
      setSelectedDate(
        direction === "prev"
          ? subDays(selectedDate, 1)
          : addDays(selectedDate, 1)
      )
    } else {
      setSelectedDate(
        direction === "prev"
          ? subDays(selectedDate, 7)
          : addDays(selectedDate, 7)
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">
            Time Tracking
          </h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Track time spent on jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-[#E3E8EE] text-[#425466]"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
          <Button
            onClick={openAddDialog}
            size="sm"
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Time Entry
          </Button>
        </div>
      </div>

      {/* Active Timer Section */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#8898AA] uppercase tracking-wider mb-4">
          Timer
        </h2>

        {!timerRunning ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-xs text-[#8898AA] mb-1.5 block">
                Job (optional)
              </Label>
              <Select value={timerJobId} onValueChange={setTimerJobId}>
                <SelectTrigger className="h-10 border-[#E3E8EE]">
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-xs text-[#8898AA] mb-1.5 block">
                Notes (optional)
              </Label>
              <Input
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                placeholder="What are you working on?"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
            <Button
              onClick={handleStartTimer}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white h-10 px-6"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Start Timer
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left">
              <div className="text-5xl font-mono font-bold text-[#0A2540] tracking-tight">
                {formatElapsed(elapsed)}
              </div>
              {timerJobId && jobs.find((j) => j.id === timerJobId) && (
                <p className="text-sm text-[#635BFF] mt-1.5 font-medium">
                  {jobs.find((j) => j.id === timerJobId)?.title}
                </p>
              )}
              {timerNotes && (
                <p className="text-sm text-[#425466] mt-0.5">{timerNotes}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                onClick={handleStopTimer}
                className="bg-red-600 hover:bg-red-700 text-white h-10 px-6"
              >
                <Square className="w-4 h-4 mr-1.5" />
                Stop
              </Button>
              <Button
                onClick={handleDiscardTimer}
                variant="outline"
                className="h-10 border-[#E3E8EE] text-[#425466]"
              >
                <X className="w-4 h-4 mr-1.5" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Timesheet Section */}
      <div className="bg-white rounded-lg border border-[#E3E8EE]">
        {/* Timesheet header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-[#E3E8EE]">
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-[#E3E8EE] overflow-hidden">
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "day"
                    ? "bg-[#635BFF] text-white"
                    : "bg-white text-[#425466] hover:bg-[#F6F8FA]"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-[#E3E8EE] ${
                  viewMode === "week"
                    ? "bg-[#635BFF] text-white"
                    : "bg-white text-[#425466] hover:bg-[#F6F8FA]"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => { setViewMode("all"); setAllPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-lg transition-colors border-l border-[#E3E8EE] ${
                  viewMode === "all"
                    ? "bg-[#635BFF] text-white"
                    : "bg-white text-[#425466] hover:bg-[#F6F8FA]"
                }`}
              >
                All
              </button>
            </div>
            {teamMembers.length > 0 && (
              <Select value={teamMemberFilter} onValueChange={(v) => { setTeamMemberFilter(v); if (viewMode === "all") setAllPage(1); }}>
                <SelectTrigger className="w-[180px] h-9 border-[#E3E8EE] text-sm">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date navigator */}
          {viewMode !== "all" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#E3E8EE]"
              onClick={() => navigateDate("prev")}
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 border-[#E3E8EE] text-sm text-[#0A2540] font-medium min-w-[180px]"
                >
                  <CalendarIcon className="w-4 h-4 mr-1.5 text-[#8898AA]" />
                  {viewMode === "day"
                    ? format(selectedDate, "EEEE, MMM d, yyyy")
                    : `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setDatePickerOpen(false)
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#E3E8EE]"
              onClick={() => navigateDate("next")}
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 border-[#E3E8EE] text-xs text-[#425466]"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </div>
          )}
        </div>

        {/* Day View */}
        {viewMode === "day" && (
          <div className={loading ? "opacity-50" : ""}>
            {dayEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="w-12 h-12 text-[#8898AA] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A2540] mb-1">
                  No time entries
                </h3>
                <p className="text-sm text-[#8898AA]">
                  No time tracked for {format(selectedDate, "MMM d, yyyy")}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Start
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          End
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Job
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                          Notes
                        </th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50"
                        >
                          <td className="px-4 py-3 text-sm text-[#0A2540]">
                            {formatTimeOnly(entry.clockIn)}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#0A2540]">
                            {entry.clockOut
                              ? formatTimeOnly(entry.clockOut)
                              : "Running..."}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                            {entry.durationMinutes != null
                              ? formatMinutesToHM(entry.durationMinutes)
                              : "--"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#425466]">
                            {entry.jobTitle ?? (
                              <span className="text-[#8898AA]">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#425466] max-w-[200px] truncate">
                            {entry.notes ?? (
                              <span className="text-[#8898AA]">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(entry)}
                                aria-label="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#8898AA]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteEntry(entry.id)}
                                aria-label="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3E8EE] bg-[#F6F8FA]">
                  <span className="text-sm font-semibold text-[#0A2540]">
                    Total
                  </span>
                  <span className="text-sm font-semibold text-[#0A2540]">
                    {formatMinutesToHM(totalMinutesToday)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className={`overflow-x-auto ${loading ? "opacity-50" : ""}`}>
            {teamMembers.length === 0 && entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="w-12 h-12 text-[#8898AA] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A2540] mb-1">
                  No time entries this week
                </h3>
                <p className="text-sm text-[#8898AA]">
                  {format(weekStart, "MMM d")} -{" "}
                  {format(weekEnd, "MMM d, yyyy")}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] min-w-[150px]">
                      Team Member
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={`px-3 py-3 text-center text-xs font-semibold uppercase text-[#8898AA] min-w-[80px] ${
                          isSameDay(day, new Date())
                            ? "bg-[#635BFF]/5"
                            : ""
                        }`}
                      >
                        <div>{format(day, "EEE")}</div>
                        <div className="text-[10px] font-normal mt-0.5">
                          {format(day, "MMM d")}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-[#0A2540] min-w-[80px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(teamMembers.length > 0
                    ? teamMembers
                    : [{ id: "current", name: "You" }]
                  ).map((member) => {
                    const weekData = getWeekDataForMember(member.id)
                    const weekTotal = weekData.reduce((s, m) => s + m, 0)
                    return (
                      <tr
                        key={member.id}
                        className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                          {member.name}
                        </td>
                        {weekData.map((mins, i) => (
                          <td
                            key={i}
                            className={`px-3 py-3 text-center text-sm ${
                              mins > 0
                                ? "text-[#0A2540] font-medium"
                                : "text-[#8898AA]"
                            } ${isSameDay(weekDays[i], new Date()) ? "bg-[#635BFF]/5" : ""}`}
                          >
                            {mins > 0 ? formatMinutesToHM(mins) : "--"}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center text-sm font-semibold text-[#0A2540]">
                          {weekTotal > 0
                            ? formatMinutesToHM(weekTotal)
                            : "--"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* All View */}
        {viewMode === "all" && (
          <div className={loading ? "opacity-50" : ""}>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="w-12 h-12 text-[#8898AA] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A2540] mb-1">No time entries</h3>
                <p className="text-sm text-[#8898AA]">No time entries found.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Start</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">End</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Team Member</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Job</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Notes</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50">
                          <td className="px-4 py-3 text-sm text-[#425466]">
                            {format(new Date(entry.clockIn), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#0A2540]">
                            {format(new Date(entry.clockIn), "h:mm a")}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#0A2540]">
                            {entry.clockOut ? format(new Date(entry.clockOut), "h:mm a") : "Running..."}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                            {entry.durationMinutes != null
                              ? `${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m`
                              : "--"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#425466]">
                            {entry.userName || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#425466]">
                            {entry.jobTitle || <span className="text-[#8898AA]">--</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#425466] max-w-[200px] truncate">
                            {entry.notes || <span className="text-[#8898AA]">--</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => openEditDialog(entry)} aria-label="Edit">
                                <Pencil className="w-3.5 h-3.5 text-[#8898AA]" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => handleDeleteEntry(entry.id)} aria-label="Delete">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {allTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3E8EE]">
                    <p className="text-sm text-[#8898AA]">
                      Page {allPage} of {allTotalPages} ({allTotal} entries)
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={allPage <= 1}
                        onClick={() => setAllPage(allPage - 1)} className="h-8 border-[#E3E8EE]">
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={allPage >= allTotalPages}
                        onClick={() => setAllPage(allPage + 1)} className="h-8 border-[#E3E8EE]">
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Total for current page */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3E8EE] bg-[#F6F8FA]">
                  <span className="text-sm font-semibold text-[#0A2540]">Page Total</span>
                  <span className="text-sm font-semibold text-[#0A2540]">
                    {(() => {
                      const totalMins = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0)
                      return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`
                    })()}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Time Entry Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              {editingEntry ? "Edit Time Entry" : "Add Time Entry"}
            </DialogTitle>
            <DialogDescription className="text-[#8898AA]">
              {editingEntry
                ? "Update the details for this time entry."
                : "Manually add a time entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-[#425466]">Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#425466]">Start Time</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <div>
                <Label className="text-sm text-[#425466]">End Time</Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-[#425466]">Job (optional)</Label>
              <Select value={formJobId} onValueChange={setFormJobId}>
                <SelectTrigger className="mt-1.5 h-10 border-[#E3E8EE]">
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-[#425466]">Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add notes about the work done..."
                className="mt-1.5 border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#E3E8EE] text-[#425466]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEntry}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {editingEntry ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import {
  isSameDay,
  isToday,
  format,
  parseISO,
  differenceInMinutes,
  setHours,
  setMinutes,
} from "date-fns"
import { cn } from "@/lib/utils"
import type { CalendarJob } from "./month-view"

// ── Constants ──────────────────────────────────────────────────────────────────

const START_HOUR = 6
const END_HOUR = 20
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64
const SLOT_INCREMENT = 15

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  color: string | null
  role: string
  isActive: boolean
}

interface DayViewProps {
  jobs: CalendarJob[]
  currentDate: Date
  onJobClick: (jobId: string) => void
  onSlotClick: (date: Date, time: string) => void
  teamMembers: TeamMember[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getJobColor(job: CalendarJob): string {
  if (job.assignments.length > 0 && job.assignments[0].user.color) {
    return job.assignments[0].user.color
  }
  return "#635BFF"
}

function getJobPosition(job: CalendarJob) {
  const start = parseISO(job.scheduledStart)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const topMinutes = Math.max(startMinutes - START_HOUR * 60, 0)

  let durationMinutes = 60
  if (job.scheduledEnd) {
    const end = parseISO(job.scheduledEnd)
    durationMinutes = differenceInMinutes(end, start)
  }
  durationMinutes = Math.max(durationMinutes, 30)

  const top = (topMinutes / 60) * HOUR_HEIGHT
  const height = (durationMinutes / 60) * HOUR_HEIGHT

  return { top, height }
}

function roundToSlot(minutes: number): number {
  return Math.floor(minutes / SLOT_INCREMENT) * SLOT_INCREMENT
}

// ── Component ──────────────────────────────────────────────────────────────────

export function DayView({ jobs, currentDate, onJobClick, onSlotClick, teamMembers }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)

  const hours = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)
  }, [])

  const today = isToday(currentDate)

  // Filter active team members that have assigned jobs today
  const activeMembers = useMemo(() => {
    const active = teamMembers.filter((m) => m.isActive)
    if (active.length <= 1) return active
    return active
  }, [teamMembers])

  // Multi-column layout: group jobs by team member
  const useMultiColumn = activeMembers.length > 1

  const jobsByMember = useMemo(() => {
    if (!useMultiColumn) {
      return { all: jobs.filter((j) => isSameDay(parseISO(j.scheduledStart), currentDate)) }
    }

    const map: Record<string, CalendarJob[]> = {}
    for (const member of activeMembers) {
      map[member.id] = []
    }
    map["unassigned"] = []

    const dayJobs = jobs.filter((j) => isSameDay(parseISO(j.scheduledStart), currentDate))

    for (const job of dayJobs) {
      if (job.assignments.length === 0) {
        map["unassigned"].push(job)
      } else {
        for (const assignment of job.assignments) {
          if (map[assignment.user.id]) {
            map[assignment.user.id].push(job)
          }
        }
      }
    }

    return map
  }, [jobs, currentDate, activeMembers, useMultiColumn])

  // Current time
  useEffect(() => {
    function updateTime() {
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const offset = nowMinutes - START_HOUR * 60
      if (offset >= 0 && offset <= TOTAL_HOURS * 60) {
        setCurrentTimeTop((offset / 60) * HOUR_HEIGHT)
      } else {
        setCurrentTimeTop(null)
      }
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const offset8am = (8 - START_HOUR) * HOUR_HEIGHT
      scrollRef.current.scrollTop = offset8am - 20
    }
  }, [])

  function handleSlotClick(hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top
    const minuteOffset = roundToSlot(Math.floor((yOffset / HOUR_HEIGHT) * 60))
    const totalMinutes = hour * 60 + minuteOffset
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    onSlotClick(currentDate, timeStr)
  }

  const columns = useMultiColumn
    ? activeMembers.map((m) => ({ key: m.id, label: `${m.firstName} ${m.lastName}`, color: m.color || "#635BFF", jobs: jobsByMember[m.id] || [] }))
    : [{ key: "all", label: format(currentDate, "EEEE, MMMM d"), color: "#635BFF", jobs: jobsByMember["all"] || [] }]

  const colCount = columns.length

  return (
    <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div
        className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]"
        style={{ gridTemplateColumns: `64px repeat(${colCount}, 1fr)` }}
      >
        <div className="border-r border-[#E3E8EE] py-3 px-2">
          <p className="text-[10px] font-semibold uppercase text-[#8898AA]">
            {format(currentDate, "EEE")}
          </p>
          <p className={cn("text-lg font-semibold", today ? "text-[#635BFF]" : "text-[#0A2540]")}>
            {format(currentDate, "d")}
          </p>
        </div>
        {columns.map((col) => (
          <div
            key={col.key}
            className="flex items-center gap-2 px-3 py-3 border-r border-[#E3E8EE] last:border-r-0"
          >
            {useMultiColumn && (
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
            )}
            <span className="text-sm font-medium text-[#0A2540] truncate">{col.label}</span>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
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
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "relative border-r border-[#E3E8EE] last:border-r-0",
                today && "bg-[#635BFF]/[0.02]"
              )}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-[#E3E8EE] cursor-pointer hover:bg-[#F6F8FA]/60 transition-colors"
                  style={{ height: HOUR_HEIGHT }}
                  onClick={(e) => handleSlotClick(hour, e)}
                />
              ))}

              {/* Current time indicator */}
              {today && currentTimeTop !== null && (
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

              {/* Job blocks */}
              {col.jobs.map((job) => {
                const { top, height } = getJobPosition(job)
                const color = getJobColor(job)

                return (
                  <button
                    key={job.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onJobClick(job.id)
                    }}
                    className="absolute left-1 right-1 z-10 rounded-md px-2 py-1 text-left overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
                    style={{
                      top,
                      height: Math.max(height, 28),
                      backgroundColor: `${color}18`,
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <p className="text-xs font-semibold text-[#0A2540] truncate leading-tight">
                      {job.customer.firstName} {job.customer.lastName}
                    </p>
                    {height >= 44 && (
                      <p className="text-[11px] text-[#425466] truncate leading-tight mt-0.5">
                        {format(parseISO(job.scheduledStart), "h:mm a")}
                        {job.scheduledEnd && ` - ${format(parseISO(job.scheduledEnd), "h:mm a")}`}
                      </p>
                    )}
                    {height >= 62 && (
                      <p className="text-[11px] text-[#8898AA] truncate leading-tight mt-0.5">
                        {job.title}
                      </p>
                    )}
                    {height >= 80 && job.assignments.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] text-[#8898AA] truncate">
                          {job.assignments[0].user.firstName} {job.assignments[0].user.lastName}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

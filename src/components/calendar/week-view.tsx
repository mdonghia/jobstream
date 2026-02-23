"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
  parseISO,
  differenceInMinutes,
  setHours,
  setMinutes,
} from "date-fns"
import { cn } from "@/lib/utils"
import { DraggableJob, DroppableSlot, ResizeHandle } from "./dnd-wrappers"
import type { DragData, DropData } from "./dnd-wrappers"
import type { CalendarJob } from "./month-view"
import { computeOverlapLayout } from "./overlap-layout"

// ── Constants ──────────────────────────────────────────────────────────────────

export const WEEK_START_HOUR = 6
export const WEEK_END_HOUR = 20
export const WEEK_TOTAL_HOURS = WEEK_END_HOUR - WEEK_START_HOUR // 14
export const WEEK_HOUR_HEIGHT = 60 // px per hour
const SLOT_INCREMENT = 15 // minutes

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeekViewProps {
  jobs: CalendarJob[]
  currentDate: Date
  onJobClick: (jobId: string) => void
  onSlotClick: (date: Date, time: string) => void
  onResize?: (jobId: string, newDurationMinutes: number) => void
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
  const topMinutes = Math.max(startMinutes - WEEK_START_HOUR * 60, 0)

  let durationMinutes = 60 // default 1 hour
  if (job.scheduledEnd) {
    const end = parseISO(job.scheduledEnd)
    durationMinutes = differenceInMinutes(end, start)
  }
  // Clamp minimum height
  durationMinutes = Math.max(durationMinutes, 30)

  const top = (topMinutes / 60) * WEEK_HOUR_HEIGHT
  const height = (durationMinutes / 60) * WEEK_HOUR_HEIGHT

  return { top, height, durationMinutes }
}

function roundToSlot(minutes: number): number {
  return Math.floor(minutes / SLOT_INCREMENT) * SLOT_INCREMENT
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WeekView({ jobs, currentDate, onJobClick, onSlotClick, onResize }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null)

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const hours = useMemo(() => {
    return Array.from({ length: WEEK_TOTAL_HOURS }, (_, i) => WEEK_START_HOUR + i)
  }, [])

  // Jobs grouped by day
  const jobsByDay = useMemo(() => {
    const map: Record<string, CalendarJob[]> = {}
    for (const day of weekDays) {
      const key = format(day, "yyyy-MM-dd")
      map[key] = []
    }
    for (const job of jobs) {
      const jobDate = parseISO(job.scheduledStart)
      for (const day of weekDays) {
        if (isSameDay(jobDate, day)) {
          const key = format(day, "yyyy-MM-dd")
          map[key].push(job)
        }
      }
    }
    return map
  }, [jobs, weekDays])

  // Current time indicator
  useEffect(() => {
    function updateTime() {
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const offset = nowMinutes - WEEK_START_HOUR * 60
      if (offset >= 0 && offset <= WEEK_TOTAL_HOURS * 60) {
        setCurrentTimeTop((offset / 60) * WEEK_HOUR_HEIGHT)
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
      const offset8am = (8 - WEEK_START_HOUR) * WEEK_HOUR_HEIGHT
      scrollRef.current.scrollTop = offset8am - 20
    }
  }, [])

  function handleSlotClick(day: Date, hour: number, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const yOffset = e.clientY - rect.top
    const minuteOffset = roundToSlot(Math.floor((yOffset / WEEK_HOUR_HEIGHT) * 60))
    const totalMinutes = hour * 60 + minuteOffset
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    onSlotClick(day, timeStr)
  }

  const todayIndex = weekDays.findIndex((d) => isToday(d))

  return (
    <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
      {/* Header row with day names */}
      <div className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
        <div className="border-r border-[#E3E8EE]" />
        {weekDays.map((day) => {
          const today = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-2 border-r border-[#E3E8EE] last:border-r-0",
                today && "bg-[#635BFF]/5"
              )}
            >
              <p className="text-[10px] font-semibold uppercase text-[#8898AA]">
                {format(day, "EEE")}
              </p>
              <p
                className={cn(
                  "text-lg font-semibold mt-0.5",
                  today ? "text-[#635BFF]" : "text-[#0A2540]"
                )}
              >
                {format(day, "d")}
              </p>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
        <div className="relative grid" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
          {/* Time labels column */}
          <div className="border-r border-[#E3E8EE]">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-[#E3E8EE]"
                style={{ height: WEEK_HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-[10px] text-[#8898AA] font-medium">
                  {format(setMinutes(setHours(new Date(), hour), 0), "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dayKey = format(day, "yyyy-MM-dd")
            const dayJobs = jobsByDay[dayKey] || []
            const today = isToday(day)

            return (
              <div
                key={dayKey}
                className={cn(
                  "relative border-r border-[#E3E8EE] last:border-r-0",
                  today && "bg-[#635BFF]/[0.02]"
                )}
              >
                {/* Hour grid lines — each is a droppable slot */}
                {hours.map((hour) => {
                  const slotId = `week-${dayKey}-${hour}`
                  const timeStr = `${hour.toString().padStart(2, "0")}:00`
                  const dropData: DropData = {
                    type: "time-slot",
                    date: dayKey,
                    time: timeStr,
                    hour,
                  }

                  return (
                    <DroppableSlot
                      key={hour}
                      id={slotId}
                      data={dropData}
                    >
                      <div
                        className="border-b border-[#E3E8EE] cursor-pointer hover:bg-[#F6F8FA]/60 transition-colors"
                        style={{ height: WEEK_HOUR_HEIGHT }}
                        onClick={(e) => handleSlotClick(day, hour, e)}
                      />
                    </DroppableSlot>
                  )
                })}

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
                {(() => {
                  const overlapLayout = computeOverlapLayout(dayJobs)
                  return dayJobs.map((job) => {
                  const { top, height, durationMinutes } = getJobPosition(job)
                  const color = getJobColor(job)
                  const dragData: DragData = {
                    type: "job",
                    job,
                    sourceDate: dayKey,
                    sourceMemberId: job.assignments.length > 0 ? job.assignments[0].user.id : undefined,
                  }
                  const layout = overlapLayout.get(job.id)
                  const colIndex = layout?.colIndex ?? 0
                  const totalCols = layout?.totalCols ?? 1

                  return (
                    <DraggableJob
                      key={job.id}
                      id={job.id}
                      data={dragData}
                      className="absolute z-10 rounded-md text-left overflow-hidden transition-shadow hover:shadow-md group"
                      style={{
                        top,
                        height: Math.max(height, 24),
                        left: `calc(${(colIndex / totalCols) * 100}% + 2px)`,
                        width: `calc(${(1 / totalCols) * 100}% - 4px)`,
                        backgroundColor: `${color}18`,
                        borderLeft: `3px solid ${color}`,
                        position: "absolute",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onJobClick(job.id)
                        }}
                        className="w-full h-full px-1.5 py-1 text-left cursor-pointer"
                      >
                        <p className="text-[11px] font-semibold text-[#0A2540] truncate leading-tight">
                          {job.customer.firstName} {job.customer.lastName}
                        </p>
                        {height >= 40 && (
                          <p className="text-[10px] text-[#425466] truncate leading-tight mt-0.5">
                            {format(parseISO(job.scheduledStart), "h:mm a")}
                            {job.scheduledEnd && ` - ${format(parseISO(job.scheduledEnd), "h:mm a")}`}
                          </p>
                        )}
                        {height >= 58 && (
                          <p className="text-[10px] text-[#8898AA] truncate leading-tight mt-0.5">
                            {job.title}
                          </p>
                        )}
                      </button>
                      {/* Resize handle */}
                      {onResize && (
                        <ResizeHandle
                          jobId={job.id}
                          initialHeight={Math.max(height, 24)}
                          hourHeight={WEEK_HOUR_HEIGHT}
                          minDuration={30}
                          snapIncrement={15}
                          onResizeEnd={onResize}
                        />
                      )}
                    </DraggableJob>
                  )
                })
                })()}
              </div>
            )
          })}

          {/* Global current time line across today's column */}
          {todayIndex >= 0 && currentTimeTop !== null && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                top: currentTimeTop,
                left: `calc(64px + ${(todayIndex / 7) * 100}% * 7 / 7)`,
                width: 0,
                height: 0,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

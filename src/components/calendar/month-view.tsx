"use client"

import { useMemo, useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format,
  parseISO,
} from "date-fns"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DraggableJob, DroppableSlot } from "./dnd-wrappers"
import type { DragData, DropData } from "./dnd-wrappers"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CalendarJob {
  id: string
  /** For virtual recurring occurrences, points to the actual job record */
  realJobId?: string
  title: string
  jobNumber: string
  status: string
  priority: string
  scheduledStart: string
  scheduledEnd: string | null
  isRecurring?: boolean
  recurrenceRule?: string | null
  customer: { firstName: string; lastName: string }
  assignments: {
    user: {
      id: string
      firstName: string
      lastName: string
      color: string | null
    }
  }[]
}

interface MonthViewProps {
  jobs: CalendarJob[]
  currentDate: Date
  onJobClick: (jobId: string) => void
  onSlotClick: (date: Date) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MAX_VISIBLE = 3

function getJobColor(job: CalendarJob): string {
  if (job.assignments.length > 0 && job.assignments[0].user.color) {
    return job.assignments[0].user.color
  }
  return "#635BFF"
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MonthView({ jobs, currentDate, onJobClick, onSlotClick }: MonthViewProps) {
  const [morePopoverDay, setMorePopoverDay] = useState<string | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const jobsByDay = useMemo(() => {
    const map: Record<string, CalendarJob[]> = {}
    for (const job of jobs) {
      const dayKey = format(parseISO(job.scheduledStart), "yyyy-MM-dd")
      if (!map[dayKey]) map[dayKey] = []
      map[dayKey].push(job)
    }
    return map
  }, [jobs])

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="flex flex-col border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#E3E8EE] bg-[#F6F8FA]">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-xs font-semibold text-[#8898AA] uppercase text-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIdx) => (
        <div
          key={weekIdx}
          className="grid grid-cols-7 border-b border-[#E3E8EE] last:border-b-0"
          style={{ minHeight: 120 }}
        >
          {week.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd")
            const dayJobs = jobsByDay[dayKey] || []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const today = isToday(day)

            const dropData: DropData = {
              type: "day-slot",
              date: dayKey,
              time: "09:00",
            }

            return (
              <DroppableSlot
                key={dayKey}
                id={`month-${dayKey}`}
                data={dropData}
              >
                <div
                  className={cn(
                    "relative border-r border-[#E3E8EE] last:border-r-0 p-1 cursor-pointer transition-colors hover:bg-[#F6F8FA]/60",
                    !isCurrentMonth && "bg-[#F6F8FA]/40",
                    today && "ring-2 ring-inset ring-[#635BFF]"
                  )}
                  style={{ minHeight: 120 }}
                  onClick={() => onSlotClick(day)}
                >
                  {/* Day number */}
                  <div className="flex justify-end px-1">
                    <span
                      className={cn(
                        "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                        today
                          ? "bg-[#635BFF] text-white"
                          : isCurrentMonth
                          ? "text-[#0A2540]"
                          : "text-[#8898AA]"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Job blocks */}
                  <div className="mt-0.5 space-y-0.5">
                    {dayJobs.slice(0, MAX_VISIBLE).map((job) => {
                      const dragData: DragData = {
                        type: "job",
                        job,
                        sourceDate: dayKey,
                        sourceMemberId: job.assignments.length > 0 ? job.assignments[0].user.id : undefined,
                      }

                      return (
                        <DraggableJob
                          key={job.id}
                          id={`month-${job.id}`}
                          data={dragData}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onJobClick(job.realJobId || job.id)
                            }}
                            className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left group hover:bg-[#E3E8EE] transition-colors"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getJobColor(job) }}
                            />
                            <span className="text-[11px] text-[#0A2540] truncate leading-tight font-medium">
                              {format(parseISO(job.scheduledStart), "h:mm")}{" "}
                              {job.title}
                            </span>
                          </button>
                        </DraggableJob>
                      )
                    })}

                    {/* +X more */}
                    {dayJobs.length > MAX_VISIBLE && (
                      <Popover
                        open={morePopoverDay === dayKey}
                        onOpenChange={(open) =>
                          setMorePopoverDay(open ? dayKey : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMorePopoverDay(
                                morePopoverDay === dayKey ? null : dayKey
                              )
                            }}
                            className="w-full text-left px-1.5 py-0.5 text-[11px] font-medium text-[#635BFF] hover:text-[#5851ea] transition-colors"
                          >
                            +{dayJobs.length - MAX_VISIBLE} more
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64 p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-semibold text-[#0A2540] mb-2">
                            {format(day, "EEEE, MMMM d")}
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {dayJobs.map((job) => (
                              <button
                                key={job.id}
                                onClick={() => {
                                  setMorePopoverDay(null)
                                  onJobClick(job.realJobId || job.id)
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F6F8FA] text-left transition-colors"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: getJobColor(job),
                                  }}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-[#0A2540] truncate">
                                    {job.title}
                                  </p>
                                  <p className="text-[10px] text-[#8898AA]">
                                    {format(parseISO(job.scheduledStart), "h:mm a")}
                                    {" - "}
                                    {job.customer.firstName} {job.customer.lastName}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </DroppableSlot>
            )
          })}
        </div>
      ))}
    </div>
  )
}

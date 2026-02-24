"use client"

import { useMemo } from "react"
import {
  format,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, RotateCcw, User } from "lucide-react"
import type { CalendarJob } from "./month-view"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ListViewProps {
  jobs: CalendarJob[]
  currentDate: Date
  onJobClick?: (jobId: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const styles: Record<string, { label: string; className: string }> = {
    SCHEDULED: {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    IN_PROGRESS: {
      label: "In Progress",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  }
  const s = styles[status] || styles.SCHEDULED
  return s
}

function getPriorityBadge(priority: string) {
  const styles: Record<string, { label: string; className: string }> = {
    LOW: { label: "Low", className: "bg-gray-50 text-gray-600 border-gray-200" },
    MEDIUM: { label: "Medium", className: "bg-blue-50 text-blue-600 border-blue-200" },
    HIGH: { label: "High", className: "bg-orange-50 text-orange-600 border-orange-200" },
    URGENT: { label: "Urgent", className: "bg-red-50 text-red-600 border-red-200" },
  }
  return styles[priority] || styles.MEDIUM
}

function getJobColor(job: CalendarJob): string {
  if (job.assignments.length > 0 && job.assignments[0].user.color) {
    return job.assignments[0].user.color
  }
  return "#635BFF"
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ListView({ jobs, currentDate, onJobClick }: ListViewProps) {
  const groupedJobs = useMemo(() => {
    // Sort chronologically
    const sorted = [...jobs].sort(
      (a, b) => parseISO(a.scheduledStart).getTime() - parseISO(b.scheduledStart).getTime()
    )

    // Group by date
    const groups: { date: string; dateObj: Date; jobs: CalendarJob[] }[] = []
    const groupMap = new Map<string, CalendarJob[]>()

    for (const job of sorted) {
      const dateKey = format(parseISO(job.scheduledStart), "yyyy-MM-dd")
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, [])
      }
      groupMap.get(dateKey)!.push(job)
    }

    for (const [dateKey, dateJobs] of groupMap) {
      groups.push({
        date: dateKey,
        dateObj: parseISO(dateKey),
        jobs: dateJobs,
      })
    }

    return groups
  }, [jobs])

  if (groupedJobs.length === 0) {
    return (
      <div className="border border-[#E3E8EE] rounded-lg bg-white p-12 text-center">
        <p className="text-sm text-[#8898AA]">No jobs scheduled in this period.</p>
      </div>
    )
  }

  const today = startOfDay(new Date())

  return (
    <div className="border border-[#E3E8EE] rounded-lg bg-white overflow-hidden divide-y divide-[#E3E8EE]">
      {groupedJobs.map((group) => {
        const isPast = isBefore(group.dateObj, today)

        return (
          <div key={group.date}>
            {/* Date header */}
            <div className={cn("px-4 py-2.5 bg-[#F6F8FA] border-b border-[#E3E8EE]", isPast && "opacity-60")}>
              <h3 className="text-sm font-semibold text-[#0A2540]">
                {format(group.dateObj, "EEEE, MMMM d, yyyy")}
              </h3>
              <p className="text-xs text-[#8898AA] mt-0.5">
                {group.jobs.length} {group.jobs.length === 1 ? "job" : "jobs"}
              </p>
            </div>

            {/* Job items */}
            <div className={cn("divide-y divide-[#E3E8EE]", isPast && "opacity-50")}>
              {group.jobs.map((job) => {
                const status = getStatusBadge(job.status)
                const priority = getPriorityBadge(job.priority)
                const color = getJobColor(job)

                return (
                  <div
                    key={job.id}
                    className="flex items-start gap-4 px-4 py-3 hover:bg-[#F6F8FA]/50 transition-colors cursor-pointer"
                    style={{ borderLeft: `3px solid ${color}` }}
                    onClick={() => onJobClick?.(job.realJobId || job.id)}
                  >
                    {/* Time */}
                    <div className="shrink-0 w-28">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-[#0A2540]">
                        <Clock className="w-3.5 h-3.5 text-[#8898AA]" />
                        {format(parseISO(job.scheduledStart), "h:mm a")}
                      </div>
                      {job.scheduledEnd && (
                        <p className="text-xs text-[#8898AA] ml-5 mt-0.5">
                          to {format(parseISO(job.scheduledEnd), "h:mm a")}
                        </p>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#0A2540] truncate flex items-center gap-1">
                          {job.isRecurring && <RotateCcw className="w-3 h-3 text-[#8898AA] shrink-0" />}
                          {job.customer.firstName} {job.customer.lastName}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", status.className)}
                        >
                          {status.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", priority.className)}
                        >
                          {priority.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#425466] mt-0.5 truncate">
                        {job.title} {job.jobNumber && `(${job.jobNumber})`}
                      </p>
                    </div>

                    {/* Assigned team member */}
                    <div className="shrink-0">
                      {job.assignments.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-[#425466]">
                            {job.assignments[0].user.firstName} {job.assignments[0].user.lastName}
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
      })}
    </div>
  )
}

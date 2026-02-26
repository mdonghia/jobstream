"use client"

import { useMemo, useState } from "react"
import { format, parseISO, isSameDay, addDays, startOfWeek } from "date-fns"
import { cn } from "@/lib/utils"
import { Clock, AlertTriangle } from "lucide-react"
import type {
  CalendarVisit,
  TeamMember,
  OrientationMode,
  BusinessHours,
} from "./calendar-types"
import { getVisitColor, getPurposeLabel, getBusinessDays, DAY_KEYS } from "./calendar-types"

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeekGridProps {
  visits: CalendarVisit[]
  anytimeVisits: CalendarVisit[]
  teamMembers: TeamMember[]
  currentDate: Date
  orientation: OrientationMode
  businessHours: BusinessHours
  onDayClick: (date: Date) => void
  onVisitClick: (visit: CalendarVisit) => void
  onWeekDrop: (visitId: string, targetDate: Date, targetMemberId?: string) => void
}

const MAX_VISIBLE_CARDS = 4

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
}

const DAY_SHORT_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
}

// ── Helper: Get dates for the business week ────────────────────────────────────

function getWeekDates(currentDate: Date, businessHours: BusinessHours): { key: string; date: Date; label: string; shortLabel: string }[] {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
  const businessDays = getBusinessDays(businessHours)
  const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

  return dayOrder
    .map((dayKey, index) => ({
      key: dayKey,
      date: addDays(weekStart, index),
      label: DAY_LABELS[dayKey],
      shortLabel: DAY_SHORT_LABELS[dayKey],
    }))
    .filter((d) => businessDays.includes(d.key))
}

// ── Helper: Group visits by member and day ──────────────────────────────────────

function groupVisitsByMemberAndDay(
  visits: CalendarVisit[],
  anytimeVisits: CalendarVisit[],
  members: TeamMember[],
  weekDates: { key: string; date: Date }[]
): Record<string, Record<string, CalendarVisit[]>> {
  // Map: memberId -> dayKey -> visits[]
  const grid: Record<string, Record<string, CalendarVisit[]>> = {}

  for (const member of members) {
    grid[member.id] = {}
    for (const day of weekDates) {
      grid[member.id][day.key] = []
    }
  }
  // Unassigned bucket
  grid["unassigned"] = {}
  for (const day of weekDates) {
    grid["unassigned"][day.key] = []
  }

  const allVisits = [...visits, ...anytimeVisits]

  for (const visit of allVisits) {
    if (!visit.scheduledStart) continue
    const visitDate = parseISO(visit.scheduledStart)

    // Find matching day
    const matchingDay = weekDates.find((d) => isSameDay(d.date, visitDate))
    if (!matchingDay) continue

    if (visit.assignments.length === 0) {
      grid["unassigned"][matchingDay.key].push(visit)
    } else {
      for (const assignment of visit.assignments) {
        if (grid[assignment.user.id]) {
          grid[assignment.user.id][matchingDay.key].push(visit)
        }
      }
    }
  }

  return grid
}

// ── Visit Card (compact) ──────────────────────────────────────────────────────

function CompactVisitCard({
  visit,
  onClick,
}: {
  visit: CalendarVisit
  onClick: () => void
}) {
  const color = getVisitColor(visit)
  const isAnytime = visit.status === "ANYTIME"
  const isEmergency = visit.job.priority === "URGENT"
  const timeStr = isAnytime
    ? "Anytime"
    : visit.scheduledStart
      ? format(parseISO(visit.scheduledStart), "h:mm a")
      : ""

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight hover:shadow-sm transition-shadow truncate"
      style={{
        backgroundColor: `${color}15`,
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div className="flex items-center gap-1">
        {isEmergency && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        )}
        <span className="font-medium text-[#0A2540] truncate">
          {timeStr}
        </span>
        <span className="text-[#8898AA] truncate">
          {visit.job.customer.firstName} {visit.job.customer.lastName}
        </span>
      </div>
    </button>
  )
}

// ── Cell with overflow ──────────────────────────────────────────────────────────

function WeekCell({
  visits,
  dayDate,
  memberId,
  onVisitClick,
  onDayClick,
  onDrop,
  hasConflicts,
}: {
  visits: CalendarVisit[]
  dayDate: Date
  memberId: string
  onVisitClick: (visit: CalendarVisit) => void
  onDayClick: (date: Date) => void
  onDrop: (visitId: string, targetDate: Date, targetMemberId?: string) => void
  hasConflicts: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  // Sort: anytime first, then by time
  const sorted = useMemo(() => {
    return [...visits].sort((a, b) => {
      if (a.status === "ANYTIME" && b.status !== "ANYTIME") return -1
      if (a.status !== "ANYTIME" && b.status === "ANYTIME") return 1
      if (!a.scheduledStart) return 1
      if (!b.scheduledStart) return -1
      return parseISO(a.scheduledStart).getTime() - parseISO(b.scheduledStart).getTime()
    })
  }, [visits])

  const visibleVisits = expanded ? sorted : sorted.slice(0, MAX_VISIBLE_CARDS)
  const overflow = sorted.length - MAX_VISIBLE_CARDS

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const visitId = e.dataTransfer.getData("application/x-visit-id")
    if (visitId) {
      onDrop(visitId, dayDate, memberId !== "unassigned" ? memberId : undefined)
    }
  }

  return (
    <div
      className={cn(
        "min-h-[80px] p-1 border-b border-r border-[#E3E8EE] transition-colors",
        hasConflicts && "bg-amber-50/50"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {hasConflicts && (
        <div className="flex items-center gap-1 mb-0.5">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] text-amber-600 font-medium">Conflict</span>
        </div>
      )}
      <div className="space-y-0.5">
        {visibleVisits.map((visit) => (
          <CompactVisitCard
            key={visit.id}
            visit={visit}
            onClick={() => onVisitClick(visit)}
          />
        ))}
      </div>
      {overflow > 0 && !expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
          className="text-[10px] text-[#635BFF] hover:text-[#5851ea] font-medium mt-0.5 px-1.5"
        >
          +{overflow} more
        </button>
      )}
      {expanded && overflow > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(false)
          }}
          className="text-[10px] text-[#8898AA] hover:text-[#425466] font-medium mt-0.5 px-1.5"
        >
          Show less
        </button>
      )}
    </div>
  )
}

// ── Detect conflicts ──────────────────────────────────────────────────────────

function hasTimeConflicts(visits: CalendarVisit[]): boolean {
  const timed = visits
    .filter((v) => v.scheduledStart && v.scheduledEnd && v.status !== "ANYTIME")
    .map((v) => ({
      start: parseISO(v.scheduledStart!).getTime(),
      end: parseISO(v.scheduledEnd!).getTime(),
    }))
    .sort((a, b) => a.start - b.start)

  for (let i = 0; i < timed.length - 1; i++) {
    if (timed[i].end > timed[i + 1].start) return true
  }
  return false
}

// ── Main WeekGrid Component ──────────────────────────────────────────────────

export function WeekGrid({
  visits,
  anytimeVisits,
  teamMembers,
  currentDate,
  orientation,
  businessHours,
  onDayClick,
  onVisitClick,
  onWeekDrop,
}: WeekGridProps) {
  const activeMembers = useMemo(
    () => teamMembers.filter((m) => m.isActive),
    [teamMembers]
  )

  const weekDates = useMemo(
    () => getWeekDates(currentDate, businessHours),
    [currentDate, businessHours]
  )

  const grid = useMemo(
    () => groupVisitsByMemberAndDay(visits, anytimeVisits, activeMembers, weekDates),
    [visits, anytimeVisits, activeMembers, weekDates]
  )

  // Check if we have any unassigned visits this week
  const hasUnassigned = useMemo(() => {
    return Object.values(grid["unassigned"] || {}).some((v) => v.length > 0)
  }, [grid])

  const memberColumns = useMemo(() => {
    const cols = activeMembers.map((m) => ({
      key: m.id,
      label: `${m.firstName} ${m.lastName}`,
      color: m.color || "#635BFF",
    }))
    if (hasUnassigned) {
      cols.push({ key: "unassigned", label: "Unassigned", color: "#8898AA" })
    }
    return cols
  }, [activeMembers, hasUnassigned])

  // ── Vertical: members as columns, days as rows ──────────────────────────────

  if (orientation === "vertical") {
    return (
      <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
        {/* Column headers: team members */}
        <div
          className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]"
          style={{ gridTemplateColumns: `100px repeat(${memberColumns.length}, 1fr)` }}
        >
          <div className="border-r border-[#E3E8EE] py-3 px-3">
            <span className="text-[10px] font-semibold uppercase text-[#8898AA]">Week</span>
          </div>
          {memberColumns.map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-2 px-3 py-3 border-r border-[#E3E8EE] last:border-r-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
              <span className="text-sm font-medium text-[#0A2540] truncate">
                {col.label}
              </span>
            </div>
          ))}
        </div>

        {/* Day rows */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          {weekDates.map((day) => {
            const isToday = isSameDay(day.date, new Date())
            return (
              <div
                key={day.key}
                className="grid"
                style={{ gridTemplateColumns: `100px repeat(${memberColumns.length}, 1fr)` }}
              >
                {/* Day label (clickable) */}
                <div
                  className={cn(
                    "border-r border-b border-[#E3E8EE] px-3 py-2 cursor-pointer hover:bg-[#F6F8FA] transition-colors group",
                    isToday && "bg-[#635BFF]/[0.04]"
                  )}
                  onClick={() => onDayClick(day.date)}
                >
                  <p className="text-[10px] font-semibold uppercase text-[#8898AA] group-hover:text-[#635BFF] transition-colors">
                    {day.shortLabel}
                  </p>
                  <p className={cn(
                    "text-lg font-semibold group-hover:text-[#635BFF] group-hover:underline transition-colors",
                    isToday ? "text-[#635BFF]" : "text-[#0A2540]"
                  )}>
                    {format(day.date, "d")}
                  </p>
                </div>

                {/* Visit cells */}
                {memberColumns.map((col) => {
                  const cellVisits = grid[col.key]?.[day.key] || []
                  const conflicts = hasTimeConflicts(cellVisits)
                  return (
                    <WeekCell
                      key={col.key}
                      visits={cellVisits}
                      dayDate={day.date}
                      memberId={col.key}
                      onVisitClick={onVisitClick}
                      onDayClick={onDayClick}
                      onDrop={onWeekDrop}
                      hasConflicts={conflicts}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Horizontal: days as columns, members as rows ────────────────────────────

  return (
    <div className="border border-[#E3E8EE] rounded-lg overflow-hidden bg-white">
      {/* Column headers: days */}
      <div
        className="grid border-b border-[#E3E8EE] bg-[#F6F8FA]"
        style={{ gridTemplateColumns: `140px repeat(${weekDates.length}, 1fr)` }}
      >
        <div className="border-r border-[#E3E8EE] py-3 px-3">
          <span className="text-[10px] font-semibold uppercase text-[#8898AA]">Team</span>
        </div>
        {weekDates.map((day) => {
          const isToday = isSameDay(day.date, new Date())
          return (
            <div
              key={day.key}
              className={cn(
                "px-3 py-3 border-r border-[#E3E8EE] last:border-r-0 cursor-pointer hover:bg-[#F0F0FF] transition-colors group",
                isToday && "bg-[#635BFF]/[0.04]"
              )}
              onClick={() => onDayClick(day.date)}
            >
              <p className="text-[10px] font-semibold uppercase text-[#8898AA] group-hover:text-[#635BFF] transition-colors">
                {day.shortLabel}
              </p>
              <p className={cn(
                "text-lg font-semibold group-hover:text-[#635BFF] group-hover:underline transition-colors",
                isToday ? "text-[#635BFF]" : "text-[#0A2540]"
              )}>
                {format(day.date, "d")}
              </p>
            </div>
          )
        })}
      </div>

      {/* Member rows */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {memberColumns.map((col) => (
          <div
            key={col.key}
            className="grid"
            style={{ gridTemplateColumns: `140px repeat(${weekDates.length}, 1fr)` }}
          >
            {/* Member label */}
            <div className="border-r border-b border-[#E3E8EE] px-3 py-2 flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
              <span className="text-sm font-medium text-[#0A2540] truncate">
                {col.label}
              </span>
            </div>

            {/* Visit cells */}
            {weekDates.map((day) => {
              const cellVisits = grid[col.key]?.[day.key] || []
              const conflicts = hasTimeConflicts(cellVisits)
              return (
                <WeekCell
                  key={day.key}
                  visits={cellVisits}
                  dayDate={day.date}
                  memberId={col.key}
                  onVisitClick={onVisitClick}
                  onDayClick={onDayClick}
                  onDrop={onWeekDrop}
                  hasConflicts={conflicts}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

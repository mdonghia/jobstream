// Shared types for calendar components

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

export interface BusinessHoursDay {
  start: string // "HH:mm"
  end: string
  open: boolean
}

export type BusinessHours = Record<string, BusinessHoursDay>

export type TimeMode = "day" | "week"
export type OrientationMode = "vertical" | "horizontal"

export interface ColumnConfig {
  key: string
  label: string
  color: string
  visits: CalendarVisit[]
}

export interface MoveConfirmation {
  visitId: string
  visit: CalendarVisit
  oldDate: string // ISO
  newDate: string // ISO
  oldMemberId?: string
  newMemberId?: string
  oldMemberName?: string
  newMemberName?: string
  isDateChange: boolean
  isPersonChange: boolean
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { start: "08:00", end: "17:00", open: true },
  tue: { start: "08:00", end: "17:00", open: true },
  wed: { start: "08:00", end: "17:00", open: true },
  thu: { start: "08:00", end: "17:00", open: true },
  fri: { start: "08:00", end: "17:00", open: true },
  sat: { start: "08:00", end: "17:00", open: false },
  sun: { start: "08:00", end: "17:00", open: false },
}

// Map JS Date.getDay() (0=Sun) to our business hours keys
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

export function getBusinessDays(businessHours: BusinessHours): string[] {
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  return order.filter((day) => businessHours[day]?.open)
}

export function getBusinessStartHour(businessHours: BusinessHours): number {
  const openDays = Object.values(businessHours).filter((d) => d.open)
  if (openDays.length === 0) return 8
  const earliest = Math.min(...openDays.map((d) => parseInt(d.start.split(":")[0], 10)))
  return earliest
}

export function getBusinessEndHour(businessHours: BusinessHours): number {
  const openDays = Object.values(businessHours).filter((d) => d.open)
  if (openDays.length === 0) return 17
  const latest = Math.max(...openDays.map((d) => parseInt(d.end.split(":")[0], 10)))
  // Add 1 hour buffer to show the full last hour
  return Math.min(latest + 1, 24)
}

export function getPurposeLabel(purpose: string): string {
  const labels: Record<string, string> = {
    DIAGNOSTIC: "Diagnostic",
    SERVICE: "Service",
    FOLLOW_UP: "Follow-up",
    MAINTENANCE: "Maintenance",
  }
  return labels[purpose] || purpose
}

export function getVisitColor(visit: CalendarVisit): string {
  if (visit.assignments.length > 0 && visit.assignments[0].user.color) {
    return visit.assignments[0].user.color
  }
  return "#635BFF"
}

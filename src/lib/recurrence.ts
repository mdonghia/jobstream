/**
 * Shared recurrence calculation logic.
 *
 * Supports both legacy plain-string rules (e.g., "WEEKLY") and
 * JSON-formatted rules (e.g., {"frequency":"MONTHLY","dayOfWeek":1,"weekOfMonth":2}).
 */

interface RecurrenceConfig {
  frequency: string
  dayOfWeek?: number   // 0=Sun .. 6=Sat
  weekOfMonth?: number // 1-4
  month?: number       // 0-11 (for ANNUAL)
  months?: number[]    // 4 month indices (for QUARTERLY)
}

/**
 * Parse a recurrence rule string into a structured config.
 * Handles both legacy plain strings and JSON.
 */
export function parseRecurrenceRule(rule: string): RecurrenceConfig {
  try {
    const parsed = JSON.parse(rule)
    if (typeof parsed === "object" && parsed.frequency) {
      return parsed as RecurrenceConfig
    }
  } catch {
    // Legacy plain string like "WEEKLY"
  }
  return { frequency: rule }
}

/**
 * Find the Nth occurrence of a specific weekday in a given month/year.
 * e.g., getNthWeekdayOfMonth(2026, 2, 1, 2) = "2nd Monday of March 2026"
 *
 * @param year - Full year
 * @param month - 0-indexed month (0=Jan)
 * @param dayOfWeek - 0=Sun, 1=Mon, etc.
 * @param weekOfMonth - 1=first, 2=second, 3=third, 4=fourth
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  weekOfMonth: number
): Date {
  // Start from the 1st of the month
  const firstOfMonth = new Date(year, month, 1)
  const firstDow = firstOfMonth.getDay()

  // Calculate the date of the first occurrence of dayOfWeek in this month
  let firstOccurrence = 1 + ((dayOfWeek - firstDow + 7) % 7)

  // Advance to the Nth week
  const targetDate = firstOccurrence + (weekOfMonth - 1) * 7

  return new Date(year, month, targetDate)
}

/**
 * Calculate the next occurrence date for a recurring job.
 * Handles both legacy plain-string and JSON recurrence rules.
 */
export function calculateNextOccurrence(
  currentStart: Date,
  recurrenceRule: string
): Date {
  const config = parseRecurrenceRule(recurrenceRule)
  const next = new Date(currentStart)

  switch (config.frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1)
      return next

    case "WEEKLY":
      next.setDate(next.getDate() + 7)
      return next

    case "BIWEEKLY":
      next.setDate(next.getDate() + 14)
      return next

    case "MONTHLY":
      if (config.dayOfWeek !== undefined && config.weekOfMonth !== undefined) {
        // "Nth weekday of month" style: find the target day in the next month
        let targetMonth = next.getMonth() + 1
        let targetYear = next.getFullYear()
        if (targetMonth > 11) {
          targetMonth = 0
          targetYear++
        }
        return getNthWeekdayOfMonth(
          targetYear,
          targetMonth,
          config.dayOfWeek,
          config.weekOfMonth
        )
      }
      // Legacy fallback: just add 1 month
      next.setMonth(next.getMonth() + 1)
      return next

    case "QUARTERLY":
      if (
        config.dayOfWeek !== undefined &&
        config.weekOfMonth !== undefined &&
        config.months &&
        config.months.length > 0
      ) {
        // Find the next quarter month after the current date
        const currentMonth = next.getMonth()
        const currentYear = next.getFullYear()
        const sortedMonths = [...config.months].sort((a, b) => a - b)

        for (const m of sortedMonths) {
          if (m > currentMonth) {
            return getNthWeekdayOfMonth(currentYear, m, config.dayOfWeek, config.weekOfMonth)
          }
        }
        // Wrap to the first quarter month of next year
        return getNthWeekdayOfMonth(
          currentYear + 1,
          sortedMonths[0],
          config.dayOfWeek,
          config.weekOfMonth
        )
      }
      // Legacy fallback
      next.setMonth(next.getMonth() + 3)
      return next

    case "ANNUAL":
      if (
        config.dayOfWeek !== undefined &&
        config.weekOfMonth !== undefined &&
        config.month !== undefined
      ) {
        // Nth weekday of a specific month, next year
        const targetYear =
          config.month > next.getMonth() ||
          (config.month === next.getMonth() && getNthWeekdayOfMonth(
            next.getFullYear(), config.month, config.dayOfWeek, config.weekOfMonth
          ).getDate() > next.getDate())
            ? next.getFullYear()
            : next.getFullYear() + 1
        return getNthWeekdayOfMonth(
          targetYear,
          config.month,
          config.dayOfWeek,
          config.weekOfMonth
        )
      }
      // Legacy fallback (ANNUALLY)
      next.setFullYear(next.getFullYear() + 1)
      return next

    case "ANNUALLY":
      next.setFullYear(next.getFullYear() + 1)
      return next

    default:
      // Fallback to weekly
      next.setDate(next.getDate() + 7)
      return next
  }
}

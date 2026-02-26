/**
 * Format an arrival time with optional window.
 * @param scheduledStart - The scheduled start time
 * @param windowMinutes - Arrival window in minutes (0 = exact time)
 * @returns Formatted string like "at 2:00 PM" or "between 2:00 PM and 3:00 PM"
 */
export function formatArrivalTime(scheduledStart: Date, windowMinutes: number): string {
  const start = new Date(scheduledStart)
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
  const startTime = start.toLocaleTimeString('en-US', timeOptions)

  if (!windowMinutes || windowMinutes === 0) {
    return `at ${startTime}`
  }

  const end = new Date(start.getTime() + windowMinutes * 60 * 1000)
  const endTime = end.toLocaleTimeString('en-US', timeOptions)
  return `between ${startTime} and ${endTime}`
}

/**
 * Format a phone number string as the user types, using the 717-405-8253 style.
 *
 * Rules:
 *  - Strip all non-numeric characters from the input first (handles paste too).
 *  - Cap at 10 digits -- any extra digits beyond the 10th are ignored.
 *  - Insert a dash automatically after the 3rd digit and after the 6th digit.
 *
 * Examples:
 *   "7"          -> "7"
 *   "717"        -> "717"
 *   "7174"       -> "717-4"
 *   "717405"     -> "717-405"
 *   "7174058"    -> "717-405-8"
 *   "7174058253" -> "717-405-8253"
 *
 * @param value - Raw input value (may contain dashes, spaces, parens, etc.)
 * @returns Formatted phone string
 */
export function formatPhoneNumber(value: string): string {
  // Strip everything that is not a digit.
  const digits = value.replace(/\D/g, "")

  // Enforce the 10-digit maximum.
  const capped = digits.slice(0, 10)

  // Build the formatted string by inserting dashes at the right positions.
  if (capped.length <= 3) {
    return capped
  }
  if (capped.length <= 6) {
    return `${capped.slice(0, 3)}-${capped.slice(3)}`
  }
  return `${capped.slice(0, 3)}-${capped.slice(3, 6)}-${capped.slice(6)}`
}

/**
 * Get arrival window label for display
 */
export function getArrivalWindowLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "Default"
  if (minutes === 0) return "Exact time"
  if (minutes < 60) return `${minutes} min window`
  const hours = minutes / 60
  return hours === 1 ? "1 hour window" : `${hours} hour window`
}

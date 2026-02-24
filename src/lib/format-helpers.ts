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
 * Get arrival window label for display
 */
export function getArrivalWindowLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "Default"
  if (minutes === 0) return "Exact time"
  if (minutes < 60) return `${minutes} min window`
  const hours = minutes / 60
  return hours === 1 ? "1 hour window" : `${hours} hour window`
}

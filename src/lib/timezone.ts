/**
 * Timezone utilities for computing date boundaries in a given IANA timezone.
 *
 * The server (Vercel) runs in UTC. When we need to determine what "today" is
 * for a business in America/New_York, we have to convert the current UTC time
 * to that timezone's date and then compute the UTC instants that correspond to
 * midnight and 23:59:59.999 in that timezone.
 *
 * This module uses the built-in Intl API -- no extra dependencies required.
 */

/**
 * Returns the UTC Date objects for the start and end of "today" in the given
 * IANA timezone (e.g. "America/New_York").
 *
 * Example for EST (UTC-5):
 *   dayStart = 2026-02-26T05:00:00.000Z  (midnight EST)
 *   dayEnd   = 2026-02-27T04:59:59.999Z  (23:59:59.999 EST)
 */
export function todayBoundsInTz(tz: string): { dayStart: Date; dayEnd: Date } {
  const now = new Date()

  // Get today's date string in the target timezone (en-CA gives YYYY-MM-DD)
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz })
  const [year, month, day] = dateStr.split("-").map(Number)

  // Compute the timezone offset at a safe reference point (noon local avoids
  // any DST transition edge cases, which happen at 2 AM in the US).
  const refUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const utcRepr = new Date(
    refUtc.toLocaleString("en-US", { timeZone: "UTC" })
  )
  const tzRepr = new Date(
    refUtc.toLocaleString("en-US", { timeZone: tz })
  )
  const offsetMs = utcRepr.getTime() - tzRepr.getTime()

  // Midnight in the target timezone expressed as a UTC instant
  const dayStart = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0, 0) + offsetMs
  )

  // End of day: midnight + 24 hours - 1 ms
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  return { dayStart, dayEnd }
}

/**
 * Returns the UTC Date for N days ago at midnight in the given timezone.
 * Useful for "past 7 days", "past 30 days" style queries.
 */
export function daysAgoInTz(days: number, tz: string): Date {
  const now = new Date()

  // Get today's date in the target timezone, then subtract days
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz })
  const [year, month, day] = dateStr.split("-").map(Number)

  // Subtract days from the date
  const targetDate = new Date(Date.UTC(year, month - 1, day - days, 12, 0, 0))
  const targetDateStr = targetDate.toISOString().slice(0, 10)
  const [ty, tm, td] = targetDateStr.split("-").map(Number)

  // Compute offset at noon on the target date
  const refUtc = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0))
  const utcRepr = new Date(
    refUtc.toLocaleString("en-US", { timeZone: "UTC" })
  )
  const tzRepr = new Date(
    refUtc.toLocaleString("en-US", { timeZone: tz })
  )
  const offsetMs = utcRepr.getTime() - tzRepr.getTime()

  return new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0, 0) + offsetMs)
}

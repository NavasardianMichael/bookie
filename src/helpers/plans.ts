import dayjs, { Dayjs } from 'dayjs'

/**
 * A plan's expiry is an instant — the first moment it no longer applies — but people think
 * in its **last day**. The admin picks the last day, and the plan ends at the UTC midnight
 * after it; the Plan tab reads it back the same way. UTC on both sides, because that is
 * the zone the server counts the booking month in (`Provider` has no timezone), so the two
 * can never disagree about which day a plan ended on.
 */

/** The last day picked in a date picker → the instant the plan ends (the next UTC midnight). */
export const toPlanExpiryISO = (lastDay: Dayjs): string =>
  new Date(Date.UTC(lastDay.year(), lastDay.month(), lastDay.date() + 1)).toISOString()

/**
 * An expiry instant → its last covered day, as a `Date` to format with `timeZone: 'UTC'`.
 * One millisecond before the end is still inside the last day in UTC.
 */
export const toPlanLastDay = (expiresAtISO: string): Date => new Date(Date.parse(expiresAtISO) - 1)

/** The same last day as a local-midnight `Dayjs`, which is what antd's `DatePicker` shows. */
export const toPlanLastDayValue = (expiresAtISO: string): Dayjs => {
  const lastDay = toPlanLastDay(expiresAtISO)
  return dayjs(new Date(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()))
}

/**
 * How much of a limit is used, as a whole percentage for a progress bar — capped at 100,
 * since a downgraded provider can sit above their new limit. `null` when unlimited: there
 * is no bar to draw against infinity.
 */
export const usagePercent = (used: number, limit: number | null): number | null => {
  if (limit === null) return null
  if (limit <= 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

/** Room for one more under `limit` (`null` is unlimited) — the client twin of the API's `hasRoomFor`. */
export const hasRoomFor = (used: number, limit: number | null): boolean => limit === null || used < limit

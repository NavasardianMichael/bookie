/**
 * A provider's time zone — `Provider.timeZone` — as the API validates, stores and reads it.
 *
 * Import-free on purpose, like `error-response.ts`, so `tests/unit/server/` can reach it.
 * The browser twin is `src/helpers/timeZone.ts`; `server/` has no import path into `src/`.
 */

/**
 * Every zone a provider may store, and therefore every zone Explore's open-today filter
 * has to group by. `Intl`'s catalogue leaves out `UTC` itself, which a browser on a
 * UTC-configured machine reports, so it is added back.
 */
export const SUPPORTED_TIME_ZONES: readonly string[] = [...Intl.supportedValuesOf('timeZone'), 'UTC']

const SUPPORTED = new Set(SUPPORTED_TIME_ZONES)

/**
 * `raw` as the canonical IANA name, or `null` when it names no zone this runtime knows.
 *
 * **Canonical, not as typed.** A browser reports `Asia/Kolkata` where Node's ICU resolves
 * `Asia/Calcutta`, and `US/Eastern` is an alias of `America/New_York`. Storing what
 * `resolvedOptions()` answers makes every stored zone a member of `SUPPORTED_TIME_ZONES`,
 * which is what lets `providerSearch.ts#openTodayWhere` match providers with `IN` lists
 * rather than per-row zone maths it cannot express in Prisma.
 */
export function toTimeZone(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return null
  try {
    const canonical = new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone
    return SUPPORTED.has(canonical) ? canonical : null
  } catch {
    return null
  }
}

/** Lowercase English weekday names — the keys `weekSchedule` is stored under. */
export type WeekdayName = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

/** One formatter per zone: constructing `Intl.DateTimeFormat` dominates the cost of using it. */
const weekdayFormatters = new Map<string, Intl.DateTimeFormat>()

const weekdayFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = weekdayFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' })
    weekdayFormatters.set(timeZone, formatter)
  }
  return formatter
}

/** The `weekSchedule` key for the day `instant` falls on, as seen in `timeZone`. */
export function weekdayInZone(instant: Date, timeZone: string): WeekdayName {
  return weekdayFormatter(timeZone).format(instant).toLowerCase() as WeekdayName
}

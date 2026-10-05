import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { DAY_KEY_FORMAT } from '@constants/schedule'

// `inTimeZone` returns UTC-mode instances, so their fields read as a zone's wall clock
// without the visitor's own DST rules shifting them. Extended here for this module only,
// like `customParseFormat` in `booking.ts`.
dayjs.extend(utc)

/**
 * A provider's schedule is wall-clock `'HH:mm'` in **their** zone (`details.timeZone`), while a
 * slot is an instant. Everything that turns one into the other, or shows an instant as a
 * provider's wall-clock time, goes through here.
 *
 * Every function that takes `timeZone?` treats `undefined` as "the runtime's own zone" — the
 * reading every slot had before `Provider.timeZone` existed, and still the right one for a
 * provider who has not set it. The server twin is `server/src/lib/time-zone.ts`; this one
 * cannot import it.
 */

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

/** One per zone: constructing `Intl.DateTimeFormat` costs far more than formatting with it. */
const partsFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatters.set(timeZone, formatter)
  }
  return formatter
}

/** Whether `Intl` can format in `value` — the only test of a zone name that matters here. */
export const isTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value) return false
  try {
    partsFormatter(value)
    return true
  } catch {
    return false
  }
}

/**
 * The zone this runtime formats in: the visitor's, in a browser; the server's, during SSR.
 * Read it in a client component through `useViewerTimeZone`, which keeps it out of the
 * server render so the two cannot disagree on hydration.
 */
export const getRuntimeTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

/** How far ahead of UTC `timeZone` is at `instant`, in milliseconds. Positive east of Greenwich. */
export const zoneOffsetMs = (instant: Date, timeZone: string): number => {
  const parts = partsFormatter(timeZone).formatToParts(instant)
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  // `% 24`: some ICU builds still render midnight as 24 despite `hourCycle: 'h23'`.
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour') % 24, read('minute'), read('second'))
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * The instant at which the wall clock in `timeZone` reads `minutes` past midnight on
 * `dayKey` (`YYYY-MM-DD`).
 *
 * There is no `Date` constructor that takes a zone, so this asks what a UTC guess renders as
 * in the zone and subtracts the difference — twice, because the first reading can sit on the
 * other side of a DST change from the answer. Same method as the server's
 * `providerBookings.ts#zonedDateToUtc`. A wall time a spring-forward skips resolves to an
 * instant an hour either side of it; nobody keeps hours inside that gap.
 */
export const zonedTimeToDate = (dayKey: string, minutes: number, timeZone: string): Date => {
  const [year, month, day] = dayKey.split('-').map(Number)
  const guess = Date.UTC(year, month - 1, day, 0, minutes)
  const candidate = guess - zoneOffsetMs(new Date(guess), timeZone)
  return new Date(guess - zoneOffsetMs(new Date(candidate), timeZone))
}

/**
 * `instant` as the wall clock in `timeZone` shows it — for **formatting and day maths only**.
 *
 * With a zone, the result is a UTC-mode dayjs whose fields equal that zone's local time, so
 * `.format(getTimeDisplayFormat(…))` prints the provider's clock in the active dayjs locale. Never call
 * `.toDate()` / `.valueOf()` on it: the instant it holds is shifted by the offset. Without
 * a zone it is a plain local dayjs, which is exactly what the callers did before.
 */
export const inTimeZone = (instant: Date | string | number, timeZone?: string): Dayjs => {
  const date = new Date(instant)
  return timeZone ? dayjs.utc(date.getTime() + zoneOffsetMs(date, timeZone)) : dayjs(date)
}

/** `YYYY-MM-DD` of the day `instant` falls on in `timeZone` — the key slot counts and grids use. */
export const dayKeyOf = (instant: Date | string | number, timeZone?: string): string =>
  inTimeZone(instant, timeZone).format(DAY_KEY_FORMAT)

/**
 * The calendar day `instant` falls on in `timeZone`, as the **local-midnight** dayjs the
 * month grids carry their days as (`buildMonthCells`). A carrier for a date, not an instant:
 * comparing it with another carrier is safe, using it as a moment is not.
 */
export const calendarDayOf = (instant: Date | string | number, timeZone?: string): Dayjs => {
  const zoned = inTimeZone(instant, timeZone)
  return dayjs(new Date(zoned.year(), zoned.month(), zoned.date()))
}

const zoneNamePart = (timeZone: string, locale: string, at: Date, style: 'longGeneric' | 'shortOffset'): string =>
  new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')?.value ?? timeZone

/** `GMT+4`, in `locale` — the offset at `at`, so it follows the zone's DST. */
export const formatUtcOffset = (timeZone: string, locale: string, at: Date = new Date()): string =>
  zoneNamePart(timeZone, locale, at, 'shortOffset')

/**
 * `Armenia Standard Time (GMT+4)`, in `locale`, from `Intl`'s own catalogue — so every one of
 * the 16 locales gets a translated zone name without a message key per zone. The offset is
 * left off when the name already is one (`UTC` reads `GMT+00:00`).
 */
export const formatTimeZoneName = (timeZone: string, locale: string, at: Date = new Date()): string => {
  const name = zoneNamePart(timeZone, locale, at, 'longGeneric')
  const offset = formatUtcOffset(timeZone, locale, at)
  return name.includes(offset) ? name : `${name} (${offset})`
}

/** Whether two zones show the same wall clock at `at` — when they do, one label is enough. */
export const isSameWallClock = (left: string, right: string, at: Date = new Date()): boolean =>
  zoneOffsetMs(at, left) === zoneOffsetMs(at, right)

/**
 * Every zone the picker offers. `current` is added when the catalogue lists it under another
 * name: the API stores Node's canonical spelling (`Asia/Calcutta`), and a browser's catalogue
 * may carry only the newer one (`Asia/Kolkata`).
 */
export const listTimeZones = (current?: string): string[] => {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  return current && !zones.includes(current) ? [current, ...zones] : zones
}

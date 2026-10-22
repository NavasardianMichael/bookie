import { wallClockInZone, type WeekdayName } from './time-zone.js'

/**
 * Which days a service can be booked on — `Service.availability` — as the API validates,
 * stores and checks it.
 *
 * **A service picks days, never hours.** On a day it is offered, it is bookable during the
 * provider's own hours that day (`Provider.weekSchedule`), so no mode can widen them. The
 * narrowing happens here, on every read, rather than once on save: a provider who later
 * shortens their week shortens every service with it.
 *
 * Imports only `time-zone.ts`, so `tests/unit/server/` can reach it. The browser twin of
 * `splitScheduleIntoParts` / `effectiveDayParts` is `src/helpers/serviceAvailability.ts`;
 * `tests/unit/server/serviceAvailability.spec.ts` runs one case table against both.
 */

export type SchedulePart = { start: string; end: string }

export type ServiceAvailability =
  | { mode: 'always' }
  | { mode: 'weekdays'; days: WeekdayName[] }
  | { mode: 'monthDays'; days: number[] }
  | { mode: 'dates'; dates: string[] }

/** A year of single dates is far past any real use, and bounds the stored JSON. */
export const MAX_SERVICE_DATES = 366

export const WEEKDAYS: readonly WeekdayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const ALWAYS: ServiceAvailability = { mode: 'always' }
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

const isTime = (value: unknown): value is string => typeof value === 'string' && TIME.test(value)

const toMinutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isWeekday = (value: unknown): value is WeekdayName => WEEKDAYS.includes(value as WeekdayName)

/** A real calendar date — `2026-02-30` matches the pattern and is still refused. */
const isDayKey = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match = DAY_KEY.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const readPart = (raw: unknown): SchedulePart | null =>
  isRecord(raw) && isTime(raw.start) && isTime(raw.end) ? { start: raw.start, end: raw.end } : null

/**
 * A day's bookable windows: its availability minus its merged breaks. `'HH:mm'` sorts as
 * text, so the comparisons are string comparisons. Tolerates whatever a `Json` column
 * holds — an unreadable day is a closed day.
 */
export function splitScheduleIntoParts(day: unknown): SchedulePart[] {
  if (!isRecord(day)) return []
  const availability = readPart(day.availability)
  if (!availability || availability.start >= availability.end) return []

  const breaks = (Array.isArray(day.breaks) ? day.breaks : [])
    .map(readPart)
    .filter((part): part is SchedulePart => part !== null && part.start < part.end)
    .sort((left, right) => left.start.localeCompare(right.start))

  const parts: SchedulePart[] = []
  let cursor = availability.start
  for (const brk of breaks) {
    if (brk.start >= availability.end) break
    if (brk.start > cursor) parts.push({ start: cursor, end: brk.start })
    if (brk.end > cursor) cursor = brk.end
  }
  if (cursor < availability.end) parts.push({ start: cursor, end: availability.end })
  return parts
}

/** The `weekSchedule` key a `YYYY-MM-DD` falls on — a calendar day has no zone. */
export function weekdayOfDayKey(dayKey: string): WeekdayName {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number]
  return WEEKDAYS[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7]!
}

/** Whether the service's rule offers it on this calendar day, before the provider's hours are considered. */
export function isServiceDay(availability: ServiceAvailability | null | undefined, dayKey: string): boolean {
  const rule = availability ?? ALWAYS
  switch (rule.mode) {
    case 'weekdays':
      return rule.days.includes(weekdayOfDayKey(dayKey))
    case 'monthDays':
      // A day the month does not have (the 31st in April) is never `dayKey`'s, so it is skipped.
      return rule.days.includes(Number(dayKey.slice(8, 10)))
    case 'dates':
      return rule.dates.includes(dayKey)
    default:
      return true
  }
}

/**
 * The windows a service is bookable in on one calendar day of the provider's: the
 * provider's own windows that day when the service's rule offers the day, otherwise none.
 */
export function effectiveDayParts(input: {
  weekSchedule: unknown
  availability: ServiceAvailability | null | undefined
  dayKey: string
}): SchedulePart[] {
  if (!isServiceDay(input.availability, input.dayKey)) return []
  const providerDay = isRecord(input.weekSchedule) ? input.weekSchedule[weekdayOfDayKey(input.dayKey)] : undefined
  return splitScheduleIntoParts(providerDay)
}

export type ParsedServiceAvailability = { value: ServiceAvailability | null } | { error: string }

/**
 * A service write's `availability`, validated and normalised. `value: null` is "always" —
 * stored as SQL NULL, the column's meaning for every service written before it existed.
 *
 * `today` is a `YYYY-MM-DD`: dates before it are dropped, because a date that has passed
 * can never be booked again. Pass a day *behind* every zone's today (`earliestOpenDayKey`)
 * so a date that is still today somewhere is kept.
 */
export function parseServiceAvailability(raw: unknown, today: string): ParsedServiceAvailability {
  if (raw === undefined || raw === null || raw === '') return { value: null }
  if (!isRecord(raw)) return { error: 'availability must be an object' }

  switch (raw.mode) {
    case 'always':
      return { value: null }

    case 'weekdays': {
      if (!Array.isArray(raw.days) || !raw.days.every(isWeekday)) {
        return { error: 'availability.days must list weekday names' }
      }
      const days = WEEKDAYS.filter((day) => (raw.days as unknown[]).includes(day))
      if (!days.length) return { error: 'Pick at least one weekday' }
      return { value: { mode: 'weekdays', days } }
    }

    case 'monthDays': {
      if (!Array.isArray(raw.days)) return { error: 'availability.days must be a list' }
      const days = [...new Set(raw.days.map(Number))]
      if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 31)) {
        return { error: 'Days of the month run from 1 to 31' }
      }
      if (!days.length) return { error: 'Pick at least one day of the month' }
      return { value: { mode: 'monthDays', days: days.sort((a, b) => a - b) } }
    }

    case 'dates': {
      if (!Array.isArray(raw.dates)) return { error: 'availability.dates must be a list' }
      if (!raw.dates.every(isDayKey)) return { error: 'Dates must be YYYY-MM-DD' }
      const dates = [...new Set(raw.dates as string[])].filter((date) => date >= today).sort()
      if (dates.length > MAX_SERVICE_DATES) return { error: `At most ${MAX_SERVICE_DATES} dates` }
      if (!dates.length) return { error: 'Pick at least one upcoming date' }
      return { value: { mode: 'dates', dates } }
    }

    default:
      return { error: 'availability.mode must be always, weekdays, monthDays or dates' }
  }
}

/** A stored column as the API answers it. Validated on write, so an unreadable value is a stale one: read it as always. */
export function toServiceAvailability(stored: unknown): ServiceAvailability {
  const parsed = parseServiceAvailability(stored, '0000-00-00')
  return 'value' in parsed && parsed.value ? parsed.value : ALWAYS
}

/**
 * Whether `[startAt, endAt)` sits wholly inside one window the service is bookable in, on
 * the provider's clock. Fit, not grid alignment: the browser steps the grid, and a check on
 * the step would refuse every booking made before a duration change.
 *
 * **No zone, no check.** A provider who never set `timeZone` has their hours read in each
 * visitor's own zone (`src/helpers/booking.ts`), so the server cannot know which wall clock
 * the booking was made on. `docs/BACKLOG.md` tracks it.
 */
export function isWithinBookableHours(input: {
  weekSchedule: unknown
  availability: ServiceAvailability | null | undefined
  timeZone: string | null | undefined
  startAt: Date
  endAt: Date
}): boolean {
  if (!input.timeZone) return true
  const start = wallClockInZone(input.startAt, input.timeZone)
  const end = wallClockInZone(input.endAt, input.timeZone)
  if (end.dayKey !== start.dayKey) return false

  return effectiveDayParts({ weekSchedule: input.weekSchedule, availability: input.availability, dayKey: start.dayKey }).some(
    (part) => toMinutes(part.start) <= start.minutes && end.minutes <= toMinutes(part.end)
  )
}

/** `YYYY-MM-DD` of the day before `now` in UTC — behind every zone's today. */
export function earliestOpenDayKey(now: Date): string {
  return new Date(now.getTime() - 24 * 60 * 60_000).toISOString().slice(0, 10)
}

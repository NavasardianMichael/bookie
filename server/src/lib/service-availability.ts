import { wallClockInZone, type WeekdayName } from './time-zone.js'

/**
 * When a provider is open and when each of their services can be booked — `Provider.scheduleRule`,
 * `weekSchedule`, `specialDates` and `Service.availability` — as the API validates, stores and
 * checks them.
 *
 * **The provider's hours are the outer frame** (`providerDayParts`). A rule gives the base: the
 * weekly hours (`weekSchedule`, kept even while another rule is on, so switching back loses
 * nothing), days of the month with one set of hours, or specific dates only. A special date on
 * the day then decides: `open` replaces the day's hours (an added date — and, under the
 * specific-dates rule, the only open days there are); `closed` closes the whole day, or only the
 * ranges it lists.
 *
 * **A service narrows that frame, never widens it.** Its rule picks days (always / weekdays /
 * days of the month / dates) and, optionally, hours of its own — one set (`hours`) or per weekday
 * (`hoursByDay`) — and its own `exceptions` add or exclude dates the same way. On any day it is
 * bookable only where its windows and the provider's overlap. The narrowing happens here, on
 * every read, rather than once on save: a provider who later shortens their week shortens every
 * service with it. Where a service's days or hours fall outside the provider's, the web asks
 * before saving (`src/helpers/scheduleConflicts.ts`) — this module only ever intersects.
 *
 * Imports only `time-zone.ts`, so `tests/unit/server/` can reach it. The browser twin is
 * `src/helpers/serviceAvailability.ts`; `tests/unit/server/serviceAvailability.spec.ts` runs
 * one case table against both.
 */

export type SchedulePart = { start: string; end: string }

/** One day's hours as `weekSchedule` stores them: an outer window and the breaks inside it. */
export type DayHours = { availability: SchedulePart; breaks: SchedulePart[] }

/** What a 29th–31st does in a month without one: skipped, or moved to the month's last day. */
export type ShortMonths = 'skip' | 'last'

/** Days of the month a rule recurs on: 1–31, plus the month's last day, whatever its number. */
export type MonthDays = { days: number[]; lastDay?: boolean; shortMonths?: ShortMonths }

/**
 * A date exception's effect: `open` sets the day's hours (an added date), `closed` takes the
 * whole day away — or, with hours, only those ranges.
 */
export type ExceptionKind = 'open' | 'closed'

/**
 * A service's date exception — the same idea as a provider's special date, in the service's own
 * window format. `open` without `hours` is "on the provider's hours that day".
 */
export type ServiceException = {
  from: string
  to: string
  kind: ExceptionKind
  hours?: SchedulePart[]
  note?: string
}

/**
 * A service's hours beside its days: `hours` on every day it is offered, `hoursByDay` per weekday
 * (weekdays rule only, winning over `hours`), and `exceptions` for dates added or excluded.
 * Absent hours are "the provider's hours".
 */
type ServiceExtras = {
  hours?: SchedulePart[]
  hoursByDay?: Partial<Record<WeekdayName, SchedulePart[]>>
  exceptions?: ServiceException[]
}

export type ServiceAvailability = (
  | { mode: 'always' }
  | { mode: 'weekdays'; days: WeekdayName[] }
  | ({ mode: 'monthDays' } & MonthDays)
  | { mode: 'dates'; dates: string[] }
) &
  ServiceExtras

/**
 * The base of a provider's hours: the weekly hours (`weekSchedule`), days of the month with one
 * set of hours, or specific dates only — the open `specialDates`.
 */
export type ProviderScheduleRule =
  | { mode: 'weekdays' }
  | ({ mode: 'monthDays'; hours: DayHours } & MonthDays)
  | { mode: 'dates' }

/**
 * A run of calendar days that does not follow the rule. `open`: `hours` are the day's hours.
 * `closed`: closed all day when `hours` is null, otherwise closed only for those ranges.
 * `from`/`to` are inclusive `YYYY-MM-DD` on the provider's calendar; a single day has
 * `from === to`. An entry stored before `kind` existed reads as closed without hours, open with.
 */
export type SpecialDate = { from: string; to: string; kind: ExceptionKind; hours: DayHours | null; note?: string }

/** A year of single dates is far past any real use, and bounds the stored JSON. */
export const MAX_SERVICE_DATES = 366

/** The windows a service may keep to, and the breaks a day may hold — the editor's per-day cap. */
export const MAX_SERVICE_HOURS = 5

/**
 * Special-date entries a provider may hold at once — a year of single dates, because under the
 * specific-dates rule they are every open day — and the longest run one may cover.
 */
export const MAX_SPECIAL_DATES = 366

/** A service's own date exceptions. */
export const MAX_SERVICE_EXCEPTIONS = 100
export const MAX_SPECIAL_DATE_SPAN_DAYS = 366
export const SPECIAL_DATE_NOTE_MAX = 80

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
export const WEEKLY_RULE: ProviderScheduleRule = { mode: 'weekdays' }
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

const isTime = (value: unknown): value is string => typeof value === 'string' && TIME.test(value)

/** `'HH:mm'` → minutes since midnight. */
export const timeToMinutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

const toMinutes = timeToMinutes

/** Minutes since midnight → `'HH:mm'`. */
export const minutesToTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isWeekday = (value: unknown): value is WeekdayName => WEEKDAYS.includes(value as WeekdayName)

/** A real calendar date — `2026-02-30` matches the pattern and is still refused. */
export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const match = DAY_KEY.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

/** `dayKey` moved by `days` calendar days. */
export const addDaysToDayKey = (dayKey: string, days: number): string =>
  new Date(Date.parse(`${dayKey}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

const readPart = (raw: unknown): SchedulePart | null =>
  isRecord(raw) && isTime(raw.start) && isTime(raw.end) ? { start: raw.start, end: raw.end } : null

/**
 * Valid windows, sorted, with overlapping or touching ones merged — the canonical form of
 * any list of `'HH:mm'` ranges. `'HH:mm'` sorts as text, so comparisons are string ones.
 */
export function normaliseParts(parts: readonly SchedulePart[]): SchedulePart[] {
  const sorted = parts.filter((part) => part.start < part.end).sort((a, b) => a.start.localeCompare(b.start))
  const merged: SchedulePart[] = []
  for (const part of sorted) {
    const last = merged[merged.length - 1]
    if (last && part.start <= last.end) {
      if (part.end > last.end) last.end = part.end
    } else merged.push({ ...part })
  }
  return merged
}

/** Where two lists of windows overlap. Both are normalised first, so either may be raw. */
export function intersectParts(left: readonly SchedulePart[], right: readonly SchedulePart[]): SchedulePart[] {
  const a = normaliseParts(left)
  const b = normaliseParts(right)
  const result: SchedulePart[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    const start = a[i]!.start > b[j]!.start ? a[i]!.start : b[j]!.start
    const end = a[i]!.end < b[j]!.end ? a[i]!.end : b[j]!.end
    if (start < end) result.push({ start, end })
    if (a[i]!.end < b[j]!.end) i += 1
    else j += 1
  }
  return result
}

/** `left` with every window of `right` taken out. Both are normalised first, so either may be raw. */
export function subtractParts(left: readonly SchedulePart[], right: readonly SchedulePart[]): SchedulePart[] {
  const cuts = normaliseParts(right)
  const result: SchedulePart[] = []
  for (const part of normaliseParts(left)) {
    let cursor = part.start
    for (const cut of cuts) {
      if (cut.end <= cursor || cut.start >= part.end) continue
      if (cut.start > cursor) result.push({ start: cursor, end: cut.start })
      if (cut.end > cursor) cursor = cut.end
    }
    if (cursor < part.end) result.push({ start: cursor, end: part.end })
  }
  return result
}

/** Bookable windows → one outer window plus the gaps as breaks — the shape `weekSchedule` stores. */
export function partsToDayHours(parts: readonly SchedulePart[]): DayHours | null {
  const merged = normaliseParts(parts)
  if (!merged.length) return null
  const breaks: SchedulePart[] = []
  for (let index = 0; index < merged.length - 1; index += 1) {
    breaks.push({ start: merged[index]!.end, end: merged[index + 1]!.start })
  }
  return { availability: { start: merged[0]!.start, end: merged[merged.length - 1]!.end }, breaks }
}

/**
 * A day's bookable windows: its availability minus its merged breaks. Tolerates whatever a
 * `Json` column holds — an unreadable day is a closed day.
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

/** The number of days in `dayKey`'s month. */
export function daysInMonth(dayKey: string): number {
  const [year, month] = dayKey.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Whether a days-of-the-month rule falls on `dayKey`: a listed day, the month's last day when
 * `lastDay` is on, or — with `shortMonths: 'last'` — the last day of a month too short for a
 * listed day (the 31st lands on 30 April). With `'skip'` (the default) such a day just passes.
 */
export function matchesMonthDays(rule: MonthDays, dayKey: string): boolean {
  const day = Number(dayKey.slice(8, 10))
  const last = daysInMonth(dayKey)
  if (rule.days.includes(day)) return true
  if (day !== last) return false
  return Boolean(rule.lastDay) || (rule.shortMonths === 'last' && rule.days.some((listed) => listed > last))
}

/** The entry covering `dayKey`, if any. Entries never overlap, so there is at most one. */
export function specialDateOn<T extends { from: string; to: string }>(
  entries: readonly T[] | null | undefined,
  dayKey: string
): T | undefined {
  return entries?.find((entry) => entry.from <= dayKey && dayKey <= entry.to)
}

/** The provider's windows on `dayKey` from the rule alone, before any special date. */
function providerBaseParts(weekSchedule: unknown, rule: ProviderScheduleRule | null | undefined, dayKey: string) {
  switch (rule?.mode) {
    case 'monthDays':
      return matchesMonthDays(rule, dayKey) ? splitScheduleIntoParts(rule.hours) : []
    case 'dates':
      return []
    default: {
      const day = isRecord(weekSchedule) ? weekSchedule[weekdayOfDayKey(dayKey)] : undefined
      return splitScheduleIntoParts(day)
    }
  }
}

/**
 * The provider's own bookable windows on one calendar day: the rule's (`providerBaseParts`), then
 * a special date covering the day — `open` replaces them with its hours, `closed` removes the
 * whole day or only its ranges.
 */
export function providerDayParts(input: {
  weekSchedule: unknown
  specialDates?: readonly SpecialDate[] | null
  rule?: ProviderScheduleRule | null
  dayKey: string
}): SchedulePart[] {
  const special = specialDateOn(input.specialDates, input.dayKey)
  if (special?.kind === 'open') return special.hours ? splitScheduleIntoParts(special.hours) : []
  const base = providerBaseParts(input.weekSchedule, input.rule, input.dayKey)
  if (!special) return base
  return special.hours ? subtractParts(base, splitScheduleIntoParts(special.hours)) : []
}

/** Whether the service's rule offers it on this calendar day, before hours or exceptions. */
export function isServiceDay(availability: ServiceAvailability | null | undefined, dayKey: string): boolean {
  const rule = availability ?? ALWAYS
  switch (rule.mode) {
    case 'weekdays':
      return rule.days.includes(weekdayOfDayKey(dayKey))
    case 'monthDays':
      return matchesMonthDays(rule, dayKey)
    case 'dates':
      return rule.dates.includes(dayKey)
    default:
      return true
  }
}

/** The service's own hours on `dayKey` by its rule: that weekday's, else the shared set, else none (the provider's). */
export function serviceRuleHours(
  availability: ServiceAvailability | null | undefined,
  dayKey: string
): SchedulePart[] | undefined {
  if (!availability) return undefined
  const byDay = availability.mode === 'weekdays' ? availability.hoursByDay?.[weekdayOfDayKey(dayKey)] : undefined
  if (byDay?.length) return byDay
  return availability.hours?.length ? availability.hours : undefined
}

/**
 * The windows a service is bookable in on one calendar day of the provider's — always inside the
 * provider's own windows that day (`providerDayParts`):
 *
 * - an `open` exception offers the day at its hours (or the provider's, without any);
 * - a `closed` one without hours takes the day away;
 * - otherwise the rule decides the day and its hours (`serviceRuleHours`), and a `closed`
 *   exception with hours cuts those ranges out.
 */
export function effectiveDayParts(input: {
  weekSchedule: unknown
  specialDates?: readonly SpecialDate[] | null
  rule?: ProviderScheduleRule | null
  availability: ServiceAvailability | null | undefined
  dayKey: string
}): SchedulePart[] {
  const exception = specialDateOn(input.availability?.exceptions, input.dayKey)
  if (exception?.kind === 'closed' && !exception.hours?.length) return []
  const provider = providerDayParts(input)
  if (exception?.kind === 'open') return exception.hours?.length ? intersectParts(provider, exception.hours) : provider
  if (!isServiceDay(input.availability, input.dayKey)) return []
  const own = serviceRuleHours(input.availability, input.dayKey)
  const parts = own ? intersectParts(provider, own) : provider
  return exception?.hours?.length ? subtractParts(parts, exception.hours) : parts
}

export type ParsedServiceAvailability = { value: ServiceAvailability | null } | { error: string }

/** A list of `'HH:mm'` windows: absent or empty is `null` ("the provider's hours"); otherwise up to five. */
function parseWindows(raw: unknown, field: string): { value: SchedulePart[] | null } | { error: string } {
  if (raw === undefined || raw === null) return { value: null }
  if (!Array.isArray(raw)) return { error: `${field} must be a list` }
  const parts = raw.map(readPart)
  if (parts.some((part) => part === null || part.start >= part.end)) {
    return { error: `${field} must be HH:mm windows that end after they start` }
  }
  const merged = normaliseParts(parts as SchedulePart[])
  if (merged.length > MAX_SERVICE_HOURS) return { error: `At most ${MAX_SERVICE_HOURS} time windows` }
  return { value: merged.length ? merged : null }
}

/** `availability.hours`: absent or empty is "the provider's hours"; otherwise up to five windows. */
const parseServiceHours = (raw: unknown) => parseWindows(raw, 'availability.hours')

/** `availability.hoursByDay`: weekday → windows, only for weekdays the rule lists. */
function parseHoursByDay(
  raw: unknown,
  days: readonly WeekdayName[]
): { value: Partial<Record<WeekdayName, SchedulePart[]>> | null } | { error: string } {
  if (raw === undefined || raw === null) return { value: null }
  if (!isRecord(raw)) return { error: 'availability.hoursByDay must be an object' }
  const value: Partial<Record<WeekdayName, SchedulePart[]>> = {}
  for (const [key, windows] of Object.entries(raw)) {
    if (!isWeekday(key)) return { error: `Unknown weekday: ${key}` }
    const parsed = parseWindows(windows, `availability.hoursByDay.${key}`)
    if ('error' in parsed) return parsed
    if (parsed.value && days.includes(key)) value[key] = parsed.value
  }
  return { value: Object.keys(value).length ? value : null }
}

/** `lastDay` / `shortMonths` beside a days-of-the-month list. */
function parseMonthDays(raw: Record<string, unknown>, field: string): { value: MonthDays } | { error: string } {
  if (!Array.isArray(raw.days)) return { error: `${field}.days must be a list` }
  const days = [...new Set(raw.days.map(Number))]
  if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 31)) {
    return { error: 'Days of the month run from 1 to 31' }
  }
  const lastDay = raw.lastDay === true
  if (!days.length && !lastDay) return { error: 'Pick at least one day of the month' }
  if (raw.shortMonths !== undefined && raw.shortMonths !== 'skip' && raw.shortMonths !== 'last') {
    return { error: `${field}.shortMonths must be skip or last` }
  }
  return {
    value: {
      days: days.sort((a, b) => a - b),
      ...(lastDay ? { lastDay } : {}),
      ...(raw.shortMonths === 'last' ? { shortMonths: 'last' as const } : {}),
    },
  }
}

/** An exception's `kind`; an entry written before it existed is `closed` without hours, `open` with. */
const readKind = (raw: unknown, hasHours: boolean): ExceptionKind | null => {
  if (raw === undefined || raw === null) return hasHours ? 'open' : 'closed'
  return raw === 'open' || raw === 'closed' ? raw : null
}

/** A run's `from`/`to` (inclusive, `to` defaulting to `from`) and its length cap. */
function readRun(item: unknown, label: string): { from: string; to: string } | { error: string } {
  const to: unknown = isRecord(item) ? (item.to ?? item.from) : undefined
  if (!isRecord(item) || !isDayKey(item.from) || !isDayKey(to)) {
    return { error: `Each ${label} needs from (and to) as YYYY-MM-DD` }
  }
  if (to < item.from) return { error: `${item.from}: the last day is before the first` }
  if (daysBetween(item.from, to) >= MAX_SPECIAL_DATE_SPAN_DAYS) {
    return { error: `${item.from}: one entry covers at most ${MAX_SPECIAL_DATE_SPAN_DAYS} days` }
  }
  return { from: item.from, to }
}

/** Sorted by `from`, with an overlap refused — two entries for one day would leave which one wins to order. */
function refuseOverlap<T extends { from: string; to: string }>(entries: T[], label: string): string | null {
  entries.sort((a, b) => a.from.localeCompare(b.from))
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index]!.from <= entries[index - 1]!.to) return `${entries[index]!.from} overlaps another ${label}`
  }
  return null
}

/** `availability.exceptions`: a service's added and excluded dates, past ones dropped. */
function parseServiceExceptions(raw: unknown, today: string): { value: ServiceException[] | null } | { error: string } {
  if (raw === undefined || raw === null) return { value: null }
  if (!Array.isArray(raw)) return { error: 'availability.exceptions must be a list' }
  const entries: ServiceException[] = []
  for (const item of raw) {
    const run = readRun(item, 'date exception')
    if ('error' in run) return run
    const record = item as Record<string, unknown>
    const hours = parseWindows(record.hours, `${run.from} hours`)
    if ('error' in hours) return hours
    const kind = readKind(record.kind, Boolean(hours.value))
    if (!kind) return { error: `${run.from}: kind must be open or closed` }
    const note = typeof record.note === 'string' ? record.note.trim().slice(0, SPECIAL_DATE_NOTE_MAX) : ''
    if (run.to < today) continue
    entries.push({ ...run, kind, ...(hours.value ? { hours: hours.value } : {}), ...(note ? { note } : {}) })
  }
  const overlap = refuseOverlap(entries, 'date exception')
  if (overlap) return { error: overlap }
  if (entries.length > MAX_SERVICE_EXCEPTIONS) return { error: `At most ${MAX_SERVICE_EXCEPTIONS} date exceptions` }
  return { value: entries.length ? entries : null }
}

function parseServiceDays(raw: Record<string, unknown>, today: string): ParsedServiceAvailability {
  switch (raw.mode) {
    case 'always':
    case undefined:
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
      const parsed = parseMonthDays(raw, 'availability')
      if ('error' in parsed) return parsed
      return { value: { mode: 'monthDays', ...parsed.value } }
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

/**
 * A service write's `availability`, validated and normalised. `value: null` is "always, on
 * the provider's hours" — stored as SQL NULL, the column's meaning for every service written
 * before it existed. "Always" with hours of its own is stored as an object: it says something.
 *
 * `today` is a `YYYY-MM-DD`: dates before it are dropped, because a date that has passed
 * can never be booked again. Pass a day *behind* every zone's today (`earliestOpenDayKey`)
 * so a date that is still today somewhere is kept.
 */
export function parseServiceAvailability(raw: unknown, today: string): ParsedServiceAvailability {
  if (raw === undefined || raw === null || raw === '') return { value: null }
  if (!isRecord(raw)) return { error: 'availability must be an object' }

  const hours = parseServiceHours(raw.hours)
  if ('error' in hours) return hours
  const days = parseServiceDays(raw, today)
  if ('error' in days) return days
  const rule = days.value ?? ALWAYS
  const byDay = rule.mode === 'weekdays' ? parseHoursByDay(raw.hoursByDay, rule.days) : { value: null }
  if ('error' in byDay) return byDay
  const exceptions = parseServiceExceptions(raw.exceptions, today)
  if ('error' in exceptions) return exceptions
  if (!hours.value && !byDay.value && !exceptions.value) return days
  return {
    value: {
      ...rule,
      ...(hours.value ? { hours: hours.value } : {}),
      ...(byDay.value ? { hoursByDay: byDay.value } : {}),
      ...(exceptions.value ? { exceptions: exceptions.value } : {}),
    },
  }
}

/**
 * One day's hours as a schedule write sends them — `{ availability, breaks }`, or an empty
 * window for a closed day (which reads back as `null`). Breaks must sit inside the window.
 */
export function parseDayHours(raw: unknown): { value: DayHours | null } | { error: string } {
  if (raw === null || raw === undefined) return { value: null }
  if (!isRecord(raw) || !isRecord(raw.availability)) return { error: 'A day needs availability' }
  const { start, end } = raw.availability
  if (!start && !end) return { value: null }
  const availability = readPart(raw.availability)
  if (!availability || availability.start >= availability.end) {
    return { error: 'A day opens at HH:mm and closes after it opens' }
  }
  const breaks = (Array.isArray(raw.breaks) ? raw.breaks : []).map(readPart)
  if (
    breaks.some((brk) => !brk || brk.start >= brk.end || brk.start < availability.start || brk.end > availability.end)
  ) {
    return { error: 'Breaks must be HH:mm windows inside the day' }
  }
  if (breaks.length > MAX_SERVICE_HOURS) return { error: `At most ${MAX_SERVICE_HOURS} breaks a day` }
  return { value: { availability, breaks: normaliseParts(breaks as SchedulePart[]) } }
}

/** A day's hours as `weekSchedule` stores a closed day. */
export const closedDay = (): DayHours => ({ availability: { start: '', end: '' }, breaks: [] })

/**
 * A `weekSchedule` write: every weekday present is validated (`parseDayHours`) and a closed
 * one stored as `closedDay()`. Weekdays left out are left out — a caller merging a partial
 * week onto the stored one decides what they mean.
 */
export function parseWeekSchedule(
  raw: unknown
): { value: Partial<Record<WeekdayName, DayHours>> } | { error: string } {
  if (!isRecord(raw)) return { error: 'weekSchedule must be an object' }
  const value: Partial<Record<WeekdayName, DayHours>> = {}
  for (const [key, day] of Object.entries(raw)) {
    if (!isWeekday(key)) return { error: `Unknown weekday: ${key}` }
    const parsed = parseDayHours(day)
    if ('error' in parsed) return { error: `${key}: ${parsed.error}` }
    value[key] = parsed.value ?? closedDay()
  }
  return { value }
}

/**
 * `specialDates` off a write, validated and normalised: entries sorted by `from`, any that
 * ended before `today` dropped (a date that has passed means nothing to a booking), and an
 * overlap refused — two entries for one day would leave which one wins to array order.
 * An `open` entry needs hours (they are the day's); a `closed` one may list the ranges it
 * closes. `today` is a day behind every zone's (`earliestOpenDayKey`), as for service dates.
 */
export function parseSpecialDates(raw: unknown, today: string): { value: SpecialDate[] } | { error: string } {
  if (raw === undefined || raw === null) return { value: [] }
  if (!Array.isArray(raw)) return { error: 'specialDates must be a list' }
  const entries: SpecialDate[] = []
  for (const item of raw) {
    const run = readRun(item, 'special date')
    if ('error' in run) return run
    const record = item as Record<string, unknown>
    const hours = parseDayHours(record.hours)
    if ('error' in hours) return { error: `${run.from}: ${hours.error}` }
    const kind = readKind(record.kind, Boolean(hours.value))
    if (!kind) return { error: `${run.from}: kind must be open or closed` }
    if (kind === 'open' && !hours.value) return { error: `${run.from}: an added date needs its hours` }
    const note = typeof record.note === 'string' ? record.note.trim().slice(0, SPECIAL_DATE_NOTE_MAX) : ''
    if (run.to < today) continue
    entries.push({ ...run, kind, hours: hours.value, ...(note ? { note } : {}) })
  }
  const overlap = refuseOverlap(entries, 'special date')
  if (overlap) return { error: overlap }
  if (entries.length > MAX_SPECIAL_DATES) return { error: `At most ${MAX_SPECIAL_DATES} special dates` }
  return { value: entries }
}

/**
 * `scheduleRule` off a write: `weekdays` (the weekly hours), `monthDays` with its days and one
 * set of hours, or `dates` (the open special dates only).
 */
export function parseScheduleRule(raw: unknown): { value: ProviderScheduleRule } | { error: string } {
  if (raw === undefined || raw === null) return { value: WEEKLY_RULE }
  if (!isRecord(raw)) return { error: 'scheduleRule must be an object' }
  switch (raw.mode) {
    case 'weekdays':
      return { value: WEEKLY_RULE }
    case 'dates':
      return { value: { mode: 'dates' } }
    case 'monthDays': {
      const days = parseMonthDays(raw, 'scheduleRule')
      if ('error' in days) return days
      const hours = parseDayHours(raw.hours)
      if ('error' in hours) return { error: `scheduleRule.hours: ${hours.error}` }
      if (!hours.value) return { error: 'Days of the month need their hours' }
      return { value: { mode: 'monthDays', ...days.value, hours: hours.value } }
    }
    default:
      return { error: 'scheduleRule.mode must be weekdays, monthDays or dates' }
  }
}

/** A stored `scheduleRule` as the API reads it. Validated on write; an unreadable one reads as weekly. */
export function toScheduleRule(stored: unknown): ProviderScheduleRule {
  const parsed = parseScheduleRule(stored)
  return 'value' in parsed ? parsed.value : WEEKLY_RULE
}

/** A stored `specialDates` column as the API reads it. Validated on write; an unreadable one reads as none. */
export function toSpecialDates(stored: unknown): SpecialDate[] {
  const parsed = parseSpecialDates(stored, '0000-00-00')
  return 'value' in parsed ? parsed.value : []
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
  specialDates?: readonly SpecialDate[] | null
  rule?: ProviderScheduleRule | null
  availability: ServiceAvailability | null | undefined
  timeZone: string | null | undefined
  startAt: Date
  endAt: Date
}): boolean {
  if (!input.timeZone) return true
  const start = wallClockInZone(input.startAt, input.timeZone)
  const end = wallClockInZone(input.endAt, input.timeZone)
  if (end.dayKey !== start.dayKey) return false

  return effectiveDayParts({
    weekSchedule: input.weekSchedule,
    specialDates: input.specialDates,
    rule: input.rule,
    availability: input.availability,
    dayKey: start.dayKey,
  }).some((part) => toMinutes(part.start) <= start.minutes && end.minutes <= toMinutes(part.end))
}

/** `YYYY-MM-DD` of the day before `now` in UTC — behind every zone's today. */
export function earliestOpenDayKey(now: Date): string {
  return new Date(now.getTime() - 24 * 60 * 60_000).toISOString().slice(0, 10)
}

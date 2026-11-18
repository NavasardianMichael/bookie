import {
  DaySchedulePart,
  MonthDays,
  ProviderScheduleRule,
  ServiceAvailability,
  SpecialDate,
  WeekSchedule,
} from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from './schedule'

/**
 * When the provider is open, and so which windows each service is bookable in.
 *
 * **The provider's hours are the outer frame** (`providerDayParts`): the rule's base (weekly
 * hours, days of the month, or specific dates only), then a special date on the day — `open`
 * replaces the day's hours, `closed` removes the day or only its ranges. **A service narrows
 * that frame, never widens it**: its rule, its hours (one set or per weekday) and its own
 * exceptions decide its windows, always cut to the provider's. Narrowed here on every read
 * rather than once on save, so a provider who shortens their week shortens every service with
 * it. When a service reaches outside the provider's hours, `@helpers/scheduleConflicts` asks
 * before it is saved.
 *
 * Twin: `server/src/lib/service-availability.ts`, which refuses a booking outside the same
 * windows. `tests/unit/server/serviceAvailability.spec.ts` runs one case table against both.
 */

export const ALWAYS_AVAILABLE: ServiceAvailability = { mode: 'always' }

/** How far ahead "can this ever be booked" looks — a year covers every weekday and month day. */
const LOOKAHEAD_DAYS = 366

/** The weekday a `YYYY-MM-DD` falls on. A calendar day has no zone, so it is read in UTC. */
export const weekdayOfDayKey = (dayKey: string): WeekDay => {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number]
  return WEEK_DAYS_LIST[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7]!
}

/** `dayKey` moved by `days` calendar days. */
export const addDaysToDayKey = (dayKey: string, days: number): string =>
  new Date(Date.parse(`${dayKey}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/** Valid windows, sorted, with overlapping or touching ones merged. `'HH:mm'` sorts as text. */
export const normaliseParts = (parts: readonly DaySchedulePart[]): DaySchedulePart[] => {
  const sorted = parts.filter((part) => part.start < part.end).sort((a, b) => a.start.localeCompare(b.start))
  const merged: DaySchedulePart[] = []
  for (const part of sorted) {
    const last = merged[merged.length - 1]
    if (last && part.start <= last.end) {
      if (part.end > last.end) last.end = part.end
    } else merged.push({ ...part })
  }
  return merged
}

/** `left` with every window of `right` taken out. Both are normalised first, so either may be raw. */
export const subtractParts = (left: readonly DaySchedulePart[], right: readonly DaySchedulePart[]): DaySchedulePart[] => {
  const cuts = normaliseParts(right)
  const result: DaySchedulePart[] = []
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

/** The number of days in `dayKey`'s month. */
export const daysInMonth = (dayKey: string): number => {
  const [year, month] = dayKey.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Whether a days-of-the-month rule falls on `dayKey`: a listed day, the month's last day when
 * `lastDay` is on, or — with `shortMonths: 'last'` — the last day of a month too short for a
 * listed day (the 31st lands on 30 April). With `'skip'` (the default) such a day just passes.
 */
export const matchesMonthDays = (rule: MonthDays, dayKey: string): boolean => {
  const day = Number(dayKey.slice(8, 10))
  const last = daysInMonth(dayKey)
  if (rule.days.includes(day)) return true
  if (day !== last) return false
  return Boolean(rule.lastDay) || (rule.shortMonths === 'last' && rule.days.some((listed) => listed > last))
}

/** Where two lists of windows overlap. Both are normalised first, so either may be raw. */
export const intersectParts = (left: readonly DaySchedulePart[], right: readonly DaySchedulePart[]): DaySchedulePart[] => {
  const a = normaliseParts(left)
  const b = normaliseParts(right)
  const result: DaySchedulePart[] = []
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

/** Whether the service's own rule offers it on this calendar day, before any hours. */
export const isServiceDay = (availability: ServiceAvailability | undefined, dayKey: string): boolean => {
  const rule = availability ?? ALWAYS_AVAILABLE
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

/** Whether the provider has hours on this weekday in their weekly schedule. */
export const hasDayHours = (weekSchedule: WeekSchedule | undefined, day: WeekDay): boolean =>
  !!weekSchedule?.[day]?.availability.start && !!weekSchedule?.[day]?.availability.end

/** The entry covering `dayKey`, if any. Entries never overlap. */
export const specialDateOn = <T extends { from: string; to: string }>(
  entries: readonly T[] | undefined,
  dayKey: string
): T | undefined => entries?.find((entry) => entry.from <= dayKey && dayKey <= entry.to)

/** The provider's windows on `dayKey` from the rule alone, before any special date. */
const providerBaseParts = (
  weekSchedule: WeekSchedule | undefined,
  rule: ProviderScheduleRule | undefined,
  dayKey: string
): DaySchedulePart[] => {
  switch (rule?.mode) {
    case 'monthDays':
      return matchesMonthDays(rule, dayKey) ? splitScheduleIntoParts(rule.hours) : []
    case 'dates':
      return []
    default: {
      const weekday = weekdayOfDayKey(dayKey)
      return hasDayHours(weekSchedule, weekday) ? splitScheduleIntoParts(weekSchedule![weekday]) : []
    }
  }
}

/**
 * The provider's own bookable windows on one calendar day: the rule's, then a special date
 * covering the day — `open` replaces them with its hours, `closed` removes the whole day or
 * only its ranges.
 */
export const providerDayParts = ({
  weekSchedule,
  specialDates,
  rule,
  dayKey,
}: {
  weekSchedule?: WeekSchedule
  specialDates?: readonly SpecialDate[]
  rule?: ProviderScheduleRule
  dayKey: string
}): DaySchedulePart[] => {
  const special = specialDateOn(specialDates, dayKey)
  if (special?.kind === 'open') return special.hours ? splitScheduleIntoParts(special.hours) : []
  const base = providerBaseParts(weekSchedule, rule, dayKey)
  if (!special) return base
  return special.hours ? subtractParts(base, splitScheduleIntoParts(special.hours)) : []
}

/** The service's own hours on `dayKey` by its rule: that weekday's, else the shared set, else none (the provider's). */
export const serviceRuleHours = (
  availability: ServiceAvailability | undefined,
  dayKey: string
): DaySchedulePart[] | undefined => {
  if (!availability) return undefined
  const byDay = availability.mode === 'weekdays' ? availability.hoursByDay?.[weekdayOfDayKey(dayKey)] : undefined
  if (byDay?.length) return byDay
  return availability.hours?.length ? availability.hours : undefined
}

/**
 * The windows a service is bookable in on one calendar day of the provider's — always inside the
 * provider's own windows that day: an `open` exception offers the day at its hours (or the
 * provider's), a `closed` one without hours takes it away; otherwise the rule decides the day and
 * its hours, and a `closed` exception with hours cuts those ranges out.
 */
export const effectiveDayParts = ({
  weekSchedule,
  specialDates,
  rule,
  availability,
  dayKey,
}: {
  weekSchedule?: WeekSchedule
  specialDates?: readonly SpecialDate[]
  rule?: ProviderScheduleRule
  availability?: ServiceAvailability
  dayKey: string
}): DaySchedulePart[] => {
  const exception = specialDateOn(availability?.exceptions, dayKey)
  if (exception?.kind === 'closed' && !exception.hours?.length) return []
  const provider = providerDayParts({ weekSchedule, specialDates, rule, dayKey })
  if (exception?.kind === 'open') return exception.hours?.length ? intersectParts(provider, exception.hours) : provider
  if (!isServiceDay(availability, dayKey)) return []
  const own = serviceRuleHours(availability, dayKey)
  const parts = own ? intersectParts(provider, own) : provider
  return exception?.hours?.length ? subtractParts(parts, exception.hours) : parts
}

/** The weekdays the provider has weekly hours on — the defaults a new weekday rule starts from. */
export const openWeekdays = (weekSchedule: WeekSchedule | undefined): WeekDay[] =>
  WEEK_DAYS_LIST.filter((day) => hasDayHours(weekSchedule, day))

/**
 * Whether the rule can ever meet the provider's hours. `false` means the service cannot be
 * booked at all as things stand — every chosen day closed, every chosen date past or closed,
 * or its hours never overlapping the provider's. `todayKey` is today on the provider's calendar.
 */
export const canEverBeBooked = (
  weekSchedule: WeekSchedule | undefined,
  availability: ServiceAvailability,
  todayKey: string,
  specialDates?: readonly SpecialDate[],
  rule?: ProviderScheduleRule
): boolean =>
  // A year ahead covers every weekday, every month day and every date a rule or exception can name.
  Array.from({ length: LOOKAHEAD_DAYS }, (_, offset) => addDaysToDayKey(todayKey, offset)).some(
    (dayKey) => effectiveDayParts({ weekSchedule, specialDates, rule, availability, dayKey }).length > 0
  )

/**
 * The first date still ahead that a dates-only rule names — a listed date or an added one — for
 * opening a calendar where the service can be booked. Other rules recur, so none.
 */
export const nextServiceDate = (availability: ServiceAvailability | undefined, todayKey: string): string | undefined => {
  if (availability?.mode !== 'dates') return undefined
  const added = (availability.exceptions ?? []).filter((entry) => entry.kind === 'open').map((entry) => entry.from)
  return [...availability.dates, ...added].filter((date) => date >= todayKey).sort()[0]
}

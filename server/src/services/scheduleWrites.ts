import {
  addDaysToDayKey,
  type DayHours,
  parseDayHours,
  parseSpecialDates,
  parseWeekSchedule,
  type SpecialDate,
} from '../lib/service-availability.js'
import type { WeekdayName } from '../lib/time-zone.js'

/**
 * A **change** to a provider's schedule — some weekdays, some special dates — merged onto what is
 * stored. Pure; the route is `routes/providerSchedule.ts` (`PATCH /provider-profile/schedule`),
 * which the AI assistant and the service-conflict dialog use to publish a schedule change at
 * once. The Availability tab still writes the whole schedule through `PUT /provider-profile`.
 */

/** The change as the route takes it: weekdays to replace, special dates to set or remove. */
export type ScheduleChange = {
  weekSchedule?: Partial<Record<WeekdayName, DayHours>>
  specialDates?: { set: SpecialDate[]; remove: string[] }
}

/**
 * The body's `weekSchedule` and `specialDates` validated into a change. `specialDates.set`
 * entries are full special dates (`{ from, to?, kind?, hours, note? }`); `remove` is any date inside
 * each entry to drop.
 */
export function parseScheduleChange(body: unknown, today: string): { value: ScheduleChange } | { error: string } {
  const raw = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const change: ScheduleChange = {}

  if (raw.weekSchedule !== undefined) {
    const week = parseWeekSchedule(raw.weekSchedule)
    if ('error' in week) return week
    change.weekSchedule = week.value
  }

  if (raw.specialDates !== undefined) {
    const special = (typeof raw.specialDates === 'object' && raw.specialDates !== null ? raw.specialDates : {}) as Record<
      string,
      unknown
    >
    const set = parseSpecialDates(special.set ?? [], today)
    if ('error' in set) return set
    const remove = Array.isArray(special.remove) ? special.remove.filter((d): d is string => typeof d === 'string') : []
    change.specialDates = { set: set.value, remove }
  }
  return { value: change }
}

/**
 * `current` with `change` applied: an entry covering any `remove` date goes; each `set` entry
 * then takes its days out of whatever it overlaps — a stored run is trimmed around it, not
 * dropped, so changing one day of a vacation keeps the rest of it — and is added. The result is
 * validated again (`parseSpecialDates`), so it can never hold an overlap.
 */
export function applySpecialDateChange(
  current: readonly SpecialDate[],
  change: { set: readonly SpecialDate[]; remove: readonly string[] },
  today: string
): { value: SpecialDate[] } | { error: string } {
  let next = current.filter((entry) => !change.remove.some((date) => entry.from <= date && date <= entry.to))
  for (const entry of change.set) {
    next = next.flatMap((existing): SpecialDate[] => {
      if (existing.to < entry.from || existing.from > entry.to) return [existing]
      return [
        ...(existing.from < entry.from ? [{ ...existing, to: addDaysToDayKey(entry.from, -1) }] : []),
        ...(existing.to > entry.to ? [{ ...existing, from: addDaysToDayKey(entry.to, 1) }] : []),
      ]
    })
    next.push(entry)
  }
  return parseSpecialDates(next, today)
}

/** A stored `weekSchedule` with some weekdays replaced. Unreadable storage starts from empty. */
export function applyWeekChange(stored: unknown, days: Partial<Record<WeekdayName, DayHours>>): Record<string, DayHours> {
  const base: Record<string, DayHours> = {}
  if (typeof stored === 'object' && stored !== null && !Array.isArray(stored)) {
    for (const [day, hours] of Object.entries(stored)) {
      const parsed = parseDayHours(hours)
      base[day] = 'value' in parsed && parsed.value ? parsed.value : { availability: { start: '', end: '' }, breaks: [] }
    }
  }
  return { ...base, ...days }
}

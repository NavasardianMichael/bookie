import {
  DaySchedulePart,
  ProviderScheduleRule,
  ServiceAvailability,
  SpecialDate,
  WeekSchedule,
} from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from './schedule'
import { addDaysToDayKey, effectiveDayParts, normaliseParts, subtractParts, weekdayOfDayKey } from './serviceAvailability'

/**
 * Exactly what a change of hours changes — for the dialog a provider approves it in, which names
 * every change and every service's lost times rather than "some of their days".
 *
 * Pure: "today" is a `YYYY-MM-DD` on the provider's calendar, passed in.
 */

/** A provider's hours, as both sides of a change are compared. */
export type ScheduleHours = { weekSchedule?: WeekSchedule; specialDates?: readonly SpecialDate[]; rule?: ProviderScheduleRule }

/** One line of what changes. */
export type HoursChange =
  | { kind: 'rule'; before: ProviderScheduleRule; after: ProviderScheduleRule }
  | { kind: 'weekday'; day: WeekDay; before: DaySchedulePart[]; after: DaySchedulePart[] }
  | { kind: 'specialAdded'; entry: SpecialDate }
  | { kind: 'specialRemoved'; entry: SpecialDate }
  | { kind: 'specialChanged'; before: SpecialDate; after: SpecialDate }

/**
 * Times a service loses. `parts` null: the whole day. `weekly`: the same times every week from
 * `from` to the end of the horizon; `date`: one day.
 */
export type ServiceLoss =
  | { kind: 'weekly'; day: WeekDay; from: string; parts: DaySchedulePart[] | null }
  | { kind: 'date'; dayKey: string; parts: DaySchedulePart[] | null }

const WEEKLY: ProviderScheduleRule = { mode: 'weekdays' }

const sameParts = (a: readonly DaySchedulePart[], b: readonly DaySchedulePart[]): boolean =>
  JSON.stringify(normaliseParts(a)) === JSON.stringify(normaliseParts(b))

const sameRule = (a: ProviderScheduleRule, b: ProviderScheduleRule): boolean => {
  if (a.mode !== 'monthDays' || b.mode !== 'monthDays') return a.mode === b.mode
  return (
    JSON.stringify([...a.days].sort((x, y) => x - y)) === JSON.stringify([...b.days].sort((x, y) => x - y)) &&
    Boolean(a.lastDay) === Boolean(b.lastDay) &&
    (a.shortMonths ?? 'skip') === (b.shortMonths ?? 'skip') &&
    sameParts(splitScheduleIntoParts(a.hours), splitScheduleIntoParts(b.hours))
  )
}

const sameEntry = (a: SpecialDate, b: SpecialDate): boolean =>
  a.to === b.to &&
  a.kind === b.kind &&
  (a.note ?? '') === (b.note ?? '') &&
  sameParts(a.hours ? splitScheduleIntoParts(a.hours) : [], b.hours ? splitScheduleIntoParts(b.hours) : [])

const weekdayParts = (weekSchedule: WeekSchedule | undefined, day: WeekDay): DaySchedulePart[] => {
  const source = weekSchedule?.[day]
  return source?.availability.start && source.availability.end ? splitScheduleIntoParts(source) : []
}

/**
 * Every change between two sets of hours, in reading order: how the hours repeat, each weekday
 * whose hours change (only while the hours repeat weekly — otherwise the week is kept but unused),
 * then each upcoming special date added, removed or changed, soonest first.
 */
export const hoursChanges = (before: ScheduleHours, after: ScheduleHours, todayKey: string): HoursChange[] => {
  const changes: HoursChange[] = []
  const ruleBefore = before.rule ?? WEEKLY
  const ruleAfter = after.rule ?? WEEKLY
  if (!sameRule(ruleBefore, ruleAfter)) changes.push({ kind: 'rule', before: ruleBefore, after: ruleAfter })

  if (ruleAfter.mode === 'weekdays') {
    for (const day of WEEK_DAYS_LIST) {
      // Coming from another rule, the week was not in use: compare against nothing.
      const was = ruleBefore.mode === 'weekdays' ? weekdayParts(before.weekSchedule, day) : []
      const now = weekdayParts(after.weekSchedule, day)
      if (!sameParts(was, now)) changes.push({ kind: 'weekday', day, before: was, after: now })
    }
  }

  const upcoming = (entries: readonly SpecialDate[] | undefined): SpecialDate[] =>
    (entries ?? []).filter((entry) => entry.to >= todayKey)
  const wasByFrom = new Map(upcoming(before.specialDates).map((entry) => [entry.from, entry]))
  const nowByFrom = new Map(upcoming(after.specialDates).map((entry) => [entry.from, entry]))
  const special: HoursChange[] = []
  for (const [from, entry] of nowByFrom) {
    const was = wasByFrom.get(from)
    if (!was) special.push({ kind: 'specialAdded', entry })
    else if (!sameEntry(was, entry)) special.push({ kind: 'specialChanged', before: was, after: entry })
  }
  for (const [from, entry] of wasByFrom) {
    if (!nowByFrom.has(from)) special.push({ kind: 'specialRemoved', entry })
  }
  const fromOf = (change: HoursChange): string =>
    change.kind === 'specialChanged' ? change.after.from : 'entry' in change ? change.entry.from : ''
  special.sort((a, b) => fromOf(a).localeCompare(fromOf(b)))

  return [...changes, ...special]
}

/**
 * The times a service is bookable under `before` and not under `after`, over `horizonDays` from
 * today. The same loss on the same weekday every week to the end of the horizon folds into one
 * `weekly` line; anything else — a holiday, a run that stops — is listed by day.
 */
export const serviceLosses = ({
  before,
  after,
  availability,
  todayKey,
  horizonDays,
}: {
  before: ScheduleHours
  after: ScheduleHours
  availability: ServiceAvailability
  todayKey: string
  horizonDays: number
}): ServiceLoss[] => {
  const lastKey = addDaysToDayKey(todayKey, horizonDays - 1)
  const groups = new Map<string, { day: WeekDay; parts: DaySchedulePart[] | null; dates: string[] }>()

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const dayKey = addDaysToDayKey(todayKey, offset)
    const was = effectiveDayParts({ ...before, availability, dayKey })
    if (!was.length) continue
    const now = effectiveDayParts({ ...after, availability, dayKey })
    const lost = subtractParts(was, now)
    if (!lost.length) continue
    const parts = now.length ? lost : null
    const day = weekdayOfDayKey(dayKey)
    const key = `${day}|${JSON.stringify(parts)}`
    const group = groups.get(key) ?? { day, parts, dates: [] }
    group.dates.push(dayKey)
    groups.set(key, group)
  }

  const weekly: Extract<ServiceLoss, { kind: 'weekly' }>[] = []
  const dated: Extract<ServiceLoss, { kind: 'date' }>[] = []
  for (const { day, parts, dates } of groups.values()) {
    const everyWeek = dates.every((date, index) => index === 0 || addDaysToDayKey(dates[index - 1]!, 7) === date)
    // Weekly only when it runs on to the horizon's last week and repeats at least once.
    if (dates.length > 1 && everyWeek && addDaysToDayKey(dates[dates.length - 1]!, 7) > lastKey) {
      weekly.push({ kind: 'weekly', day, from: dates[0]!, parts })
    } else dated.push(...dates.map((dayKey) => ({ kind: 'date' as const, dayKey, parts })))
  }

  weekly.sort((a, b) => WEEK_DAYS_LIST.indexOf(a.day) - WEEK_DAYS_LIST.indexOf(b.day))
  dated.sort((a, b) => a.dayKey.localeCompare(b.dayKey))
  return [...weekly, ...dated]
}

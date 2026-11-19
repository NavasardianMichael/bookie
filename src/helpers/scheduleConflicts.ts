import {
  DaySchedule,
  DaySchedulePart,
  MonthDays,
  ProviderScheduleRule,
  ServiceAvailability,
  ServiceException,
  SpecialDate,
  WeekSchedule,
} from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { rangesToDaySchedule, splitScheduleIntoParts } from './schedule'
import { HoursChange, hoursChanges, ScheduleHours, ServiceLoss, serviceLosses } from './scheduleChanges'
import {
  addDaysToDayKey,
  canEverBeBooked,
  intersectParts,
  isServiceDay,
  matchesMonthDays,
  normaliseParts,
  providerDayParts,
  serviceRuleHours,
  specialDateOn,
  subtractParts,
  weekdayOfDayKey,
} from './serviceAvailability'

/**
 * Where a service's days and hours reach outside the provider's own — and what to do about it.
 *
 * The booking rules never let a service be booked outside the provider's hours
 * (`@helpers/serviceAvailability` intersects); this module is the **warning** a provider gets
 * before that silently costs them bookings. Two directions, one vocabulary:
 *
 * - **A service saved against the hours** (`serviceConflicts`): days it is offered on — by its
 *   rule or as one of its own added dates — that the provider is closed, or its own hours running
 *   past theirs. The service sheet offers to widen the weekly hours (`widenWeekForService`), fit
 *   the service to them (`fitServiceToHours`), or save as is.
 * - **Hours published against the services and bookings** (`scheduleImpact`): services that
 *   lose days or can no longer be booked at all, and upcoming bookings left outside the hours.
 *   Nothing is cancelled; the provider is told before they publish. A service left asking for
 *   days the provider no longer has is fixed later, from its card (`ServiceConflictSheet`).
 *
 * Pure: every "today" is passed in as a `YYYY-MM-DD` on the provider's calendar.
 */

/** How far ahead a recurring rule is checked. Three months shows every weekday a dozen times. */
export const CONFLICT_HORIZON_DAYS = 90

/**
 * How far ahead fitting looks before it takes a day or an hour out of a service: a year, so a
 * day of the month or an hour only some weeks have is never cut because the next three months
 * happen to miss it.
 */
const FIT_HORIZON_DAYS = 366

/** Closed that day, or open but not for all of the service's own hours. */
export type ConflictReason = 'closed' | 'hours'

/** Days the weekly schedule leaves out, grouped by weekday. */
export type WeeklyConflict = { day: WeekDay; reason: ConflictReason; dates: string[] }

/** Days a special date leaves out, grouped by that entry. */
export type SpecialConflict = { entry: SpecialDate; reason: ConflictReason; dates: string[] }

/** Days one of the service's own added dates asks for and the provider does not give. */
export type AddedDateConflict = { entry: ServiceException; reason: ConflictReason; dates: string[] }

export type ServiceConflicts = { weekly: WeeklyConflict[]; special: SpecialConflict[]; added: AddedDateConflict[] }

type Hours = ScheduleHours

const minutesOf = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

const coveredMinutes = (parts: readonly DaySchedulePart[]): number =>
  normaliseParts(parts).reduce((sum, part) => sum + minutesOf(part.end) - minutesOf(part.start), 0)

const horizon = (todayKey: string, days: number): string[] =>
  Array.from({ length: days }, (_, offset) => addDaysToDayKey(todayKey, offset))

/** Every calendar day from `from` to `to`, both included. */
const spanDays = (from: string, to: string): string[] => {
  const days: string[] = []
  for (let dayKey = from; dayKey <= to; dayKey = addDaysToDayKey(dayKey, 1)) days.push(dayKey)
  return days
}

/**
 * What the service asks of the provider on one day: `own` hours, or `null` for "whatever you are
 * open"; `added` when one of its own added dates is the reason it asks. `undefined` when it asks
 * nothing — not its day, or excluded all day. The mirror of `effectiveDayParts`, before the
 * provider's hours cut it.
 */
type Ask = { own: DaySchedulePart[] | null; added?: ServiceException }

const askOn = (availability: ServiceAvailability, dayKey: string): Ask | undefined => {
  const exception = specialDateOn(availability.exceptions, dayKey)
  if (exception?.kind === 'open') {
    return { own: exception.hours?.length ? normaliseParts(exception.hours) : null, added: exception }
  }
  if (exception && !exception.hours?.length) return undefined
  if (!isServiceDay(availability, dayKey)) return undefined
  const ruleHours = serviceRuleHours(availability, dayKey)
  if (!ruleHours) return { own: null }
  const own = exception?.hours ? subtractParts(normaliseParts(ruleHours), exception.hours) : normaliseParts(ruleHours)
  return own.length ? { own } : undefined
}

/** The days a rule is checked on: the horizon, plus any listed or added date beyond it. */
const daysToCheck = (availability: ServiceAvailability, todayKey: string, horizonDays: number): string[] => {
  const days = new Set(horizon(todayKey, horizonDays))
  if (availability.mode === 'dates') availability.dates.forEach((date) => days.add(date))
  for (const entry of availability.exceptions ?? []) {
    if (entry.kind === 'open') spanDays(entry.from, entry.to).forEach((date) => days.add(date))
  }
  return [...days].filter((dayKey) => dayKey >= todayKey).sort()
}

/**
 * Every day in reach the service asks for and the provider does not give: closed, or — with
 * hours of its own — open for less than those hours. A plain "always" service asks for nothing
 * by its rule ("whenever the provider is open"), so only its added dates can conflict; "always"
 * with hours conflicts on open days where its hours run past the provider's. Days the service
 * excludes ask for nothing; a day it excludes some hours of asks for the rest.
 */
export const serviceConflicts = ({
  weekSchedule,
  specialDates,
  rule,
  availability,
  todayKey,
  horizonDays = CONFLICT_HORIZON_DAYS,
}: Hours & { availability: ServiceAvailability; todayKey: string; horizonDays?: number }): ServiceConflicts => {
  const anyOwnHours = Boolean(availability.hours?.length || Object.keys(availability.hoursByDay ?? {}).length)
  const anyAdded = (availability.exceptions ?? []).some((entry) => entry.kind === 'open')
  if (availability.mode === 'always' && !anyOwnHours && !anyAdded) return { weekly: [], special: [], added: [] }

  const weekly = new Map<string, WeeklyConflict>()
  const special = new Map<string, SpecialConflict>()
  const added = new Map<string, AddedDateConflict>()
  const push = <T extends { dates: string[] }>(map: Map<string, T>, key: string, make: () => T, dayKey: string): void => {
    const found = map.get(key) ?? make()
    found.dates.push(dayKey)
    map.set(key, found)
  }

  for (const dayKey of daysToCheck(availability, todayKey, horizonDays)) {
    const ask = askOn(availability, dayKey)
    if (!ask) continue
    const provider = providerDayParts({ weekSchedule, specialDates, rule, dayKey })
    let reason: ConflictReason | null = null
    // An "always" rule asks only where the provider is open; an added date asks for the day itself.
    if (!provider.length) reason = availability.mode === 'always' && !ask.added ? null : 'closed'
    else if (ask.own && coveredMinutes(intersectParts(provider, ask.own)) < coveredMinutes(ask.own)) reason = 'hours'
    if (!reason) continue

    const entry = ask.added ? undefined : specialDateOn(specialDates, dayKey)
    if (ask.added) {
      const exception = ask.added
      push(added, `${exception.from}|${reason}`, () => ({ entry: exception, reason, dates: [] }), dayKey)
    } else if (entry) {
      push(special, `${entry.from}|${reason}`, () => ({ entry, reason, dates: [] }), dayKey)
    } else {
      const day = weekdayOfDayKey(dayKey)
      push(weekly, `${day}|${reason}`, () => ({ day, reason, dates: [] }), dayKey)
    }
  }

  return {
    weekly: [...weekly.values()].sort((a, b) => WEEK_DAYS_LIST.indexOf(a.day) - WEEK_DAYS_LIST.indexOf(b.day)),
    special: [...special.values()].sort((a, b) => a.entry.from.localeCompare(b.entry.from)),
    added: [...added.values()].sort((a, b) => a.entry.from.localeCompare(b.entry.from)),
  }
}

export const hasConflicts = (conflicts: ServiceConflicts): boolean =>
  conflicts.weekly.length > 0 || conflicts.special.length > 0 || conflicts.added.length > 0

/** Days a set of conflicts covers. */
export const conflictDayCount = (conflicts: ServiceConflicts): number =>
  [...conflicts.weekly, ...conflicts.special, ...conflicts.added].reduce((sum, conflict) => sum + conflict.dates.length, 0)

/**
 * The hours a provider keeps most often, for opening a day they are closed on: the commonest
 * open weekday's windows, or nine to five when the week is empty.
 */
export const usualDayHours = (weekSchedule: WeekSchedule | undefined): DaySchedulePart[] => {
  const counts = new Map<string, { parts: DaySchedulePart[]; count: number }>()
  for (const day of WEEK_DAYS_LIST) {
    const source = weekSchedule?.[day]
    if (!source) continue
    const parts = splitScheduleIntoParts(source)
    if (!parts.length) continue
    const key = JSON.stringify(parts)
    counts.set(key, { parts, count: (counts.get(key)?.count ?? 0) + 1 })
  }
  const best = [...counts.values()].sort((a, b) => b.count - a.count)[0]
  return best?.parts ?? [{ start: '09:00', end: '17:00' }]
}

/** One weekday's hours before and after a widening, for the dialog to show. */
export type WeekdayWidening = { day: WeekDay; before: DaySchedulePart[]; after: DaySchedulePart[]; schedule: DaySchedule }

/**
 * Widening the weekly hours to fit the service: each weekday a conflict names is opened — on the
 * service's own hours that weekday (its per-day set, else its shared one), or the provider's usual
 * ones when it has none — or stretched to cover them, keeping the windows already there. Special
 * dates and the service's added dates are never touched: a holiday stays a holiday. Empty when no
 * weekly conflict exists, and when the provider's hours do not follow the week (days of the month,
 * specific dates) — the weekly hours are not what decides their days then.
 */
export const widenWeekForService = (
  conflicts: ServiceConflicts,
  weekSchedule: WeekSchedule | undefined,
  availability: ServiceAvailability,
  rule?: ProviderScheduleRule
): WeekdayWidening[] => {
  if (rule && rule.mode !== 'weekdays') return []
  const days = [...new Set(conflicts.weekly.map((conflict) => conflict.day))]
  return days.map((day) => {
    const ownSource = (availability.mode === 'weekdays' && availability.hoursByDay?.[day]?.length
      ? availability.hoursByDay[day]
      : availability.hours) ?? []
    const own = ownSource.length ? normaliseParts(ownSource) : null
    const source = weekSchedule?.[day]
    const before = source ? splitScheduleIntoParts(source) : []
    const after = normaliseParts([...before, ...(own ?? (before.length ? [] : usualDayHours(weekSchedule)))])
    return { day, before, after, schedule: rangesToDaySchedule(after) }
  })
}

const sameParts = (a: readonly DaySchedulePart[] | undefined, b: readonly DaySchedulePart[] | undefined): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Fitting the service to the provider's hours: everything it asks for that the provider never
 * gives is taken out, and nothing it can be booked for is — across a year ahead, every day and
 * window bookable before is bookable after.
 *
 * - **Weekdays**: a weekday the provider is closed on every week is dropped; its hours (per day,
 *   or the shared set) are cut to what that weekday is ever open for. When the cut leaves the
 *   weekdays with different hours, they become per-day hours.
 * - **Days of the month** (and *Last day*): one the provider is closed on every month is dropped.
 * - **Specific days**: a date the provider is closed on is dropped.
 * - **Hours** of any other rule are cut to what the provider is ever open on its days.
 * - **Added dates** the provider is closed on are dropped, and their hours cut to the provider's;
 *   excluded dates never conflict and stay.
 *
 * `null` when nothing would be left to book — the dialog then offers only the other choices.
 */
export const fitServiceToHours = (
  availability: ServiceAvailability,
  hours: Hours,
  todayKey: string
): ServiceAvailability | null => {
  const days = horizon(todayKey, FIT_HORIZON_DAYS)
  const providerCache = new Map<string, DaySchedulePart[]>()
  const provider = (dayKey: string): DaySchedulePart[] => {
    const cached = providerCache.get(dayKey)
    if (cached) return cached
    const parts = providerDayParts({ ...hours, dayKey })
    providerCache.set(dayKey, parts)
    return parts
  }
  /** Every window the provider has on any of these days, joined — all a service's hours can use there. */
  const reach = (dayKeys: readonly string[]): DaySchedulePart[] => normaliseParts(dayKeys.flatMap(provider))
  /** Own hours cut to the provider's reach over those days; `undefined` stays "the provider's hours". */
  const cut = (own: readonly DaySchedulePart[] | undefined, dayKeys: readonly string[]): DaySchedulePart[] | undefined =>
    own?.length ? intersectParts(own, reach(dayKeys)) : undefined

  // A day an added date covers, or one excluded all day, takes no hours from the rule.
  const ruleDecides = (dayKey: string): boolean => {
    const exception = specialDateOn(availability.exceptions, dayKey)
    return !exception || (exception.kind === 'closed' && Boolean(exception.hours?.length))
  }
  const ruleDays = days.filter((dayKey) => ruleDecides(dayKey) && isServiceDay(availability, dayKey))

  /** Whether the rule's own hours (or the provider's, without any) leave anything on this day. */
  const offeredOn = (dayKey: string, own: readonly DaySchedulePart[] | undefined): boolean =>
    (own?.length ? intersectParts(provider(dayKey), own) : provider(dayKey)).length > 0

  let fitted: ServiceAvailability
  switch (availability.mode) {
    case 'weekdays': {
      const kept: { day: WeekDay; own?: DaySchedulePart[] }[] = []
      for (const day of availability.days) {
        const occurrences = ruleDays.filter((dayKey) => weekdayOfDayKey(dayKey) === day)
        const source = availability.hoursByDay?.[day]?.length ? availability.hoursByDay[day] : availability.hours
        if (!occurrences.some((dayKey) => offeredOn(dayKey, source))) continue
        kept.push({ day, own: cut(source, occurrences) })
      }
      if (!kept.length) return null
      const withOwn = kept.filter((entry) => entry.own)
      // Per-day hours stay per day; one set the cut leaves different by weekday becomes per day too.
      const shared =
        !Object.keys(availability.hoursByDay ?? {}).length &&
        withOwn.length === kept.length &&
        withOwn.every((entry) => sameParts(entry.own, withOwn[0]?.own))
      fitted = { ...availability, days: kept.map((entry) => entry.day), hours: undefined, hoursByDay: undefined }
      if (shared) fitted.hours = withOwn[0]?.own
      else if (withOwn.length) fitted.hoursByDay = Object.fromEntries(withOwn.map((entry) => [entry.day, entry.own ?? []]))
      break
    }
    case 'monthDays': {
      const offered = (rule: MonthDays): boolean =>
        ruleDays.some((dayKey) => matchesMonthDays(rule, dayKey) && offeredOn(dayKey, availability.hours))
      const monthDays = availability.days.filter((day) => offered({ ...availability, days: [day], lastDay: false }))
      const lastDay = Boolean(availability.lastDay) && offered({ ...availability, days: [], lastDay: true })
      if (!monthDays.length && !lastDay) return null
      fitted = { ...availability, days: monthDays, lastDay: lastDay || undefined, hours: cut(availability.hours, ruleDays) }
      if (!fitted.lastDay) delete fitted.lastDay
      break
    }
    case 'dates': {
      // A past date, or one an exception decides, is not the rule's to cut.
      const dates = availability.dates.filter(
        (date) => date < todayKey || !ruleDecides(date) || offeredOn(date, availability.hours)
      )
      const ahead = dates.filter((date) => date >= todayKey && ruleDecides(date))
      if (!dates.some((date) => date >= todayKey)) return null
      fitted = { ...availability, dates, hours: cut(availability.hours, ahead) }
      break
    }
    default:
      fitted = { ...availability, hours: cut(availability.hours, ruleDays) }
  }
  if (!fitted.hours) delete fitted.hours
  if (!fitted.hoursByDay) delete fitted.hoursByDay

  if (availability.exceptions) {
    const exceptions = availability.exceptions.flatMap((entry): ServiceException[] => {
      if (entry.kind !== 'open' || entry.to < todayKey) return [entry]
      const span = spanDays(entry.from < todayKey ? todayKey : entry.from, entry.to)
      if (!reach(span).length) return []
      if (!entry.hours?.length) return [entry]
      const own = cut(entry.hours, span)
      return own?.length ? [{ ...entry, hours: own }] : []
    })
    if (exceptions.length) fitted.exceptions = exceptions
    else delete fitted.exceptions
  }

  return canEverBeBooked(hours.weekSchedule, fitted, todayKey, hours.specialDates, hours.rule) ? fitted : null
}

/** Whether a fit changes anything — a fit that changes nothing is not worth offering. */
export const fitChanges = (before: ServiceAvailability, fitted: ServiceAvailability | null): boolean =>
  fitted !== null && JSON.stringify(fitted) !== JSON.stringify(before)

/** A booking as the impact check reads it: its instant, and whose it is for the list. */
export type ImpactBooking = { id: string; start: string; end: string; serviceName: string; clientName: string }

export type ScheduleImpact = {
  /** Every change the new hours make — what the provider is approving. */
  changes: HoursChange[]
  /** Services that could be booked before and cannot be at all after. */
  unbookable: string[]
  /** Services that keep some days but lose others — and exactly which times. */
  narrowed: { name: string; losses: ServiceLoss[] }[]
  /** Upcoming bookings that sat inside the hours and would not. */
  bookingsOutside: ImpactBooking[]
}

type ImpactService = { name: string; active: boolean; availability: ServiceAvailability }

/**
 * What publishing `after` in place of `before` does: every change it makes (`hoursChanges`),
 * services that lose days (or every day) and exactly which times (`serviceLosses`), and upcoming
 * bookings that fall outside the new hours. `dayAndMinutes` reads an instant on the provider's
 * clock (`@helpers/timeZone`), injected to keep this pure. Inactive services are not counted —
 * nobody can book them either way.
 */
export const scheduleImpact = ({
  before,
  after,
  services,
  bookings,
  todayKey,
  dayAndMinutes,
}: {
  before: Hours
  after: Hours
  services: readonly ImpactService[]
  bookings: readonly ImpactBooking[]
  todayKey: string
  dayAndMinutes: (iso: string) => { dayKey: string; minutes: number }
}): ScheduleImpact => {
  const unbookable: string[] = []
  const narrowed: ScheduleImpact['narrowed'] = []
  for (const service of services.filter((s) => s.active)) {
    const wasBookable = canEverBeBooked(
      before.weekSchedule,
      service.availability,
      todayKey,
      before.specialDates,
      before.rule
    )
    if (!wasBookable) continue
    if (!canEverBeBooked(after.weekSchedule, service.availability, todayKey, after.specialDates, after.rule)) {
      unbookable.push(service.name)
      continue
    }
    const rule = { availability: service.availability, todayKey }
    if (conflictDayCount(serviceConflicts({ ...after, ...rule })) > conflictDayCount(serviceConflicts({ ...before, ...rule }))) {
      narrowed.push({
        name: service.name,
        losses: serviceLosses({ before, after, availability: service.availability, todayKey, horizonDays: CONFLICT_HORIZON_DAYS }),
      })
    }
  }

  const fitsHours = (hours: Hours, booking: ImpactBooking): boolean => {
    const start = dayAndMinutes(booking.start)
    const end = dayAndMinutes(booking.end)
    const parts = providerDayParts({ ...hours, dayKey: start.dayKey })
    const endMinutes = end.dayKey === start.dayKey ? end.minutes : 24 * 60
    return parts.some((part) => minutesOf(part.start) <= start.minutes && endMinutes <= minutesOf(part.end))
  }
  const bookingsOutside = bookings.filter((booking) => fitsHours(before, booking) && !fitsHours(after, booking))

  return { changes: hoursChanges(before, after, todayKey), unbookable, narrowed, bookingsOutside }
}

export const hasImpact = (impact: ScheduleImpact): boolean =>
  impact.unbookable.length > 0 || impact.narrowed.length > 0 || impact.bookingsOutside.length > 0

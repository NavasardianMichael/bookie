import {
  DaySchedule,
  DaySchedulePart,
  ServiceAvailability,
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
  normaliseParts,
  providerDayParts,
  serviceRuleHours,
  specialDateOn,
  weekdayOfDayKey,
} from './serviceAvailability'

/**
 * Where a service's days and hours reach outside the provider's own — and what to do about it.
 *
 * The booking rules never let a service be booked outside the provider's hours
 * (`@helpers/serviceAvailability` intersects); this module is the **warning** a provider gets
 * before that silently costs them bookings. Two directions, one vocabulary:
 *
 * - **A service saved against the hours** (`serviceConflicts`): days it is offered on that the
 *   provider is closed, or its own hours running past theirs. The service sheet offers to widen
 *   the weekly hours (`widenWeekForService`), fit the service to them (`fitServiceToHours`), or
 *   save as is.
 * - **Hours published against the services and bookings** (`scheduleImpact`): services that
 *   lose days or can no longer be booked at all, and upcoming bookings left outside the hours.
 *   Nothing is cancelled; the provider is told before they publish.
 *
 * Pure: every "today" is passed in as a `YYYY-MM-DD` on the provider's calendar.
 */

/** How far ahead a recurring rule is checked. Three months shows every weekday a dozen times. */
export const CONFLICT_HORIZON_DAYS = 90

/** Closed that day, or open but not for all of the service's own hours. */
export type ConflictReason = 'closed' | 'hours'

/** Days the weekly schedule leaves out, grouped by weekday. */
export type WeeklyConflict = { day: WeekDay; reason: ConflictReason; dates: string[] }

/** Days a special date leaves out, grouped by that entry. */
export type SpecialConflict = { entry: SpecialDate; reason: ConflictReason; dates: string[] }

export type ServiceConflicts = { weekly: WeeklyConflict[]; special: SpecialConflict[] }

type Hours = ScheduleHours

const minutesOf = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

const coveredMinutes = (parts: readonly DaySchedulePart[]): number =>
  normaliseParts(parts).reduce((sum, part) => sum + minutesOf(part.end) - minutesOf(part.start), 0)

/** The days a rule is checked on: its dates, or every day it is offered on in the horizon. */
const daysToCheck = (availability: ServiceAvailability, todayKey: string, horizonDays: number): string[] =>
  availability.mode === 'dates'
    ? availability.dates.filter((date) => date >= todayKey)
    : Array.from({ length: horizonDays }, (_, offset) => addDaysToDayKey(todayKey, offset)).filter((dayKey) =>
        isServiceDay(availability, dayKey)
      )

/**
 * Every day in reach the service asks for and the provider does not give: closed, or — with
 * hours of its own — open for less than those hours. A plain "always" service asks for nothing
 * ("whenever the provider is open"), so it never conflicts; "always" with hours conflicts only
 * on open days where its hours run past the provider's.
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
  if (availability.mode === 'always' && !anyOwnHours) return { weekly: [], special: [] }

  const weekly = new Map<string, WeeklyConflict>()
  const special = new Map<string, SpecialConflict>()

  for (const dayKey of daysToCheck(availability, todayKey, horizonDays)) {
    const ownHours = serviceRuleHours(availability, dayKey)
    const own = ownHours ? normaliseParts(ownHours) : null
    const provider = providerDayParts({ weekSchedule, specialDates, rule, dayKey })
    let reason: ConflictReason | null = null
    if (!provider.length) reason = availability.mode === 'always' ? null : 'closed'
    else if (own && coveredMinutes(intersectParts(provider, own)) < coveredMinutes(own)) reason = 'hours'
    if (!reason) continue

    const entry = specialDateOn(specialDates, dayKey)
    if (entry) {
      const key = `${entry.from}|${reason}`
      const found = special.get(key) ?? { entry, reason, dates: [] }
      found.dates.push(dayKey)
      special.set(key, found)
    } else {
      const day = weekdayOfDayKey(dayKey)
      const key = `${day}|${reason}`
      const found = weekly.get(key) ?? { day, reason, dates: [] }
      found.dates.push(dayKey)
      weekly.set(key, found)
    }
  }

  return {
    weekly: [...weekly.values()].sort((a, b) => WEEK_DAYS_LIST.indexOf(a.day) - WEEK_DAYS_LIST.indexOf(b.day)),
    special: [...special.values()].sort((a, b) => a.entry.from.localeCompare(b.entry.from)),
  }
}

export const hasConflicts = (conflicts: ServiceConflicts): boolean =>
  conflicts.weekly.length > 0 || conflicts.special.length > 0

/** Days a set of conflicts covers. */
export const conflictDayCount = (conflicts: ServiceConflicts): number =>
  [...conflicts.weekly, ...conflicts.special].reduce((sum, conflict) => sum + conflict.dates.length, 0)

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
 * service's own hours, or the provider's usual ones when it has none — or stretched to cover the
 * service's hours, keeping the windows already there. Special dates are never touched: a holiday
 * stays a holiday. Empty when no weekly conflict exists.
 */
export const widenWeekForService = (
  conflicts: ServiceConflicts,
  weekSchedule: WeekSchedule | undefined,
  availability: ServiceAvailability
): WeekdayWidening[] => {
  const own = availability.hours?.length ? normaliseParts(availability.hours) : null
  const days = [...new Set(conflicts.weekly.map((conflict) => conflict.day))]
  return days.map((day) => {
    const source = weekSchedule?.[day]
    const before = source ? splitScheduleIntoParts(source) : []
    const after = normaliseParts([...before, ...(own ?? (before.length ? [] : usualDayHours(weekSchedule)))])
    return { day, before, after, schedule: rangesToDaySchedule(after) }
  })
}

/**
 * Fitting the service to the provider's hours instead: weekdays and dates it cannot have are
 * dropped, and its own hours are cut to what every conflicting weekday is open for. `null` when
 * nothing would be left to book — the dialog then offers only the other two choices. Days of the
 * month are kept as they are: a month day falls on every weekday in turn, so dropping one for a
 * closed weekday would take it away from the weeks it fits.
 */
export const fitServiceToHours = (
  conflicts: ServiceConflicts,
  availability: ServiceAvailability,
  hours: Hours,
  todayKey: string
): ServiceAvailability | null => {
  const closedWeekdays = new Set(conflicts.weekly.filter((c) => c.reason === 'closed').map((c) => c.day))
  const closedDates = new Set(
    [...conflicts.weekly, ...conflicts.special].filter((c) => c.reason === 'closed').flatMap((c) => c.dates)
  )

  let own = availability.hours?.length ? normaliseParts(availability.hours) : undefined
  if (own) {
    for (const conflict of conflicts.weekly.filter((c) => c.reason === 'hours')) {
      const day = hours.weekSchedule?.[conflict.day]
      own = intersectParts(own, day ? splitScheduleIntoParts(day) : [])
    }
    if (!own.length) return null
  }
  const withHours = <T extends ServiceAvailability>(rule: T): T => (own ? { ...rule, hours: own } : { ...rule, hours: undefined })

  // Spread from the rule, so its per-weekday hours and added / excluded dates come along.
  let fitted: ServiceAvailability
  switch (availability.mode) {
    case 'weekdays': {
      const days = availability.days.filter((day) => !closedWeekdays.has(day))
      if (!days.length) return null
      const byDay = Object.fromEntries(Object.entries(availability.hoursByDay ?? {}).filter(([day]) => days.includes(day as WeekDay)))
      fitted = withHours({ ...availability, days, hoursByDay: Object.keys(byDay).length ? byDay : undefined })
      if (!fitted.hoursByDay) delete fitted.hoursByDay
      break
    }
    case 'dates': {
      const dates = availability.dates.filter((date) => !closedDates.has(date))
      if (!dates.length) return null
      fitted = withHours({ ...availability, dates })
      break
    }
    default:
      fitted = withHours(availability)
  }
  if (!fitted.hours) delete fitted.hours
  return canEverBeBooked(hours.weekSchedule, fitted, todayKey, hours.specialDates, hours.rule) ? fitted : null
}

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
 * bookings that fall outside the new hours. `dayAndMinutes` reads an instant on the
 * provider's clock (`@helpers/timeZone`), injected to keep this pure. Inactive services are not
 * counted — nobody can book them either way.
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

  const fits = (hours: Hours, booking: ImpactBooking): boolean => {
    const start = dayAndMinutes(booking.start)
    const end = dayAndMinutes(booking.end)
    const parts = providerDayParts({ ...hours, dayKey: start.dayKey })
    const endMinutes = end.dayKey === start.dayKey ? end.minutes : 24 * 60
    return parts.some((part) => minutesOf(part.start) <= start.minutes && endMinutes <= minutesOf(part.end))
  }
  const bookingsOutside = bookings.filter((booking) => fits(before, booking) && !fits(after, booking))

  return { changes: hoursChanges(before, after, todayKey), unbookable, narrowed, bookingsOutside }
}

export const hasImpact = (impact: ScheduleImpact): boolean =>
  impact.unbookable.length > 0 || impact.narrowed.length > 0 || impact.bookingsOutside.length > 0

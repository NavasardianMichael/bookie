import { DaySchedulePart, ServiceAvailability, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from './schedule'

/**
 * Which days a service is offered on, and so which windows it is bookable in.
 *
 * A service picks **days, never hours**: on an offered day it runs during the provider's
 * own hours, the only time frame there is. Narrowed here on every read rather than once on
 * save, so a provider who shortens their week shortens every service with it.
 *
 * Twin: `server/src/lib/service-availability.ts`, which refuses a booking outside the same
 * windows. `tests/unit/server/serviceAvailability.spec.ts` runs one case table against both.
 */

export const ALWAYS_AVAILABLE: ServiceAvailability = { mode: 'always' }

/** The weekday a `YYYY-MM-DD` falls on. A calendar day has no zone, so it is read in UTC. */
export const weekdayOfDayKey = (dayKey: string): WeekDay => {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number]
  return WEEK_DAYS_LIST[(new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7]!
}

/** Whether the service's own rule offers it on this calendar day, before the provider's hours. */
export const isServiceDay = (availability: ServiceAvailability | undefined, dayKey: string): boolean => {
  const rule = availability ?? ALWAYS_AVAILABLE
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

/** Whether the provider has hours on this weekday at all. */
export const hasDayHours = (weekSchedule: WeekSchedule | undefined, day: WeekDay): boolean =>
  !!weekSchedule?.[day]?.availability.start && !!weekSchedule?.[day]?.availability.end

/**
 * The windows a service is bookable in on one calendar day of the provider's: their own
 * windows that day when the service's rule offers the day, otherwise none.
 */
export const effectiveDayParts = ({
  weekSchedule,
  availability,
  dayKey,
}: {
  weekSchedule?: WeekSchedule
  availability?: ServiceAvailability
  dayKey: string
}): DaySchedulePart[] => {
  if (!isServiceDay(availability, dayKey)) return []
  const weekday = weekdayOfDayKey(dayKey)
  if (!hasDayHours(weekSchedule, weekday)) return []
  return splitScheduleIntoParts(weekSchedule![weekday])
}

/** The weekdays the provider has hours on — the only weekdays a service can be offered on. */
export const openWeekdays = (weekSchedule: WeekSchedule | undefined): WeekDay[] =>
  WEEK_DAYS_LIST.filter((day) => hasDayHours(weekSchedule, day))

/**
 * Whether the rule can ever meet the provider's hours. `false` means the service cannot be
 * booked at all as things stand — every chosen weekday closed, or every chosen date past or
 * closed. `todayKey` is today on the provider's calendar.
 */
export const canEverBeBooked = (
  weekSchedule: WeekSchedule | undefined,
  availability: ServiceAvailability,
  todayKey: string
): boolean => {
  const open = openWeekdays(weekSchedule)
  if (!open.length) return false
  switch (availability.mode) {
    case 'weekdays':
      return availability.days.some((day) => open.includes(day))
    case 'dates':
      return availability.dates.some((date) => date >= todayKey && open.includes(weekdayOfDayKey(date)))
    default:
      // Every day of the month falls on every weekday over time.
      return availability.mode === 'always' || availability.days.length > 0
  }
}

/** The first listed date still ahead, for opening a calendar where the service can be booked. */
export const nextServiceDate = (availability: ServiceAvailability | undefined, todayKey: string): string | undefined =>
  availability?.mode === 'dates' ? availability.dates.find((date) => date >= todayKey) : undefined

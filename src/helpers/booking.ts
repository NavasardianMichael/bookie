import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { splitScheduleIntoParts } from './schedule'

dayjs.extend(customParseFormat)

/** dayjs weekday index (0 = Sunday) mapped onto WEEK_DAYS_LIST (0 = Monday). */
export const getWeekDay = (date: Dayjs): WeekDay => WEEK_DAYS_LIST[(date.day() + 6) % 7]

const toMinutes = (time: string): number | undefined => {
  const parsed = dayjs(time, SCHEDULE_VALUE_FORMAT, true)
  return parsed.isValid() ? parsed.hour() * 60 + parsed.minute() : undefined
}

const hasAvailability = (day?: DaySchedule) => !!day?.availability.start && !!day?.availability.end

/**
 * The visible time window for the calendar, derived from the provider's own
 * schedule and padded by an hour on each side.
 *
 * The calendar previously ran 00:00–24:00 at a 30-minute step: 48 rows, of which
 * roughly two thirds were guaranteed empty.
 */
export const getVisibleTimeRange = (weekSchedule?: WeekSchedule): { min: string; max: string } => {
  const FALLBACK = { min: '09:00:00', max: '18:00:00' }
  if (!weekSchedule) return FALLBACK

  const days = Object.values(weekSchedule).filter(hasAvailability)
  if (!days.length) return FALLBACK

  const starts = days.map((day) => toMinutes(day.availability.start)).filter((v): v is number => v !== undefined)
  const ends = days.map((day) => toMinutes(day.availability.end)).filter((v): v is number => v !== undefined)
  if (!starts.length || !ends.length) return FALLBACK

  const pad = 60
  const minMinutes = Math.max(0, Math.min(...starts) - pad)
  const maxMinutes = Math.min(24 * 60, Math.max(...ends) + pad)

  const format = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`

  return maxMinutes > minMinutes ? { min: format(minMinutes), max: format(maxMinutes) } : FALLBACK
}

export type BookingSlot = { start: Date; end: Date }

/**
 * Bookable slots for a single date: the provider's availability minus their
 * breaks, stepped by the service duration, with anything already in the past
 * dropped.
 *
 * `generateTimeSlots` previously hardcoded 09:00–17:00 and ignored
 * `weekSchedule` entirely, even though splitScheduleIntoParts already computes
 * availability-minus-breaks.
 */
export const getSlotsForDate = ({
  weekSchedule,
  date,
  durationMinutes,
  now = new Date(),
}: {
  weekSchedule?: WeekSchedule
  date: Date
  durationMinutes: number
  now?: Date
}): BookingSlot[] => {
  if (!weekSchedule || durationMinutes <= 0) return []

  const day = dayjs(date)
  const daySchedule = weekSchedule[getWeekDay(day)]
  if (!hasAvailability(daySchedule)) return []

  const slots: BookingSlot[] = []

  splitScheduleIntoParts(daySchedule).forEach((part) => {
    const startMinutes = toMinutes(part.start)
    const endMinutes = toMinutes(part.end)
    if (startMinutes === undefined || endMinutes === undefined) return

    for (let at = startMinutes; at + durationMinutes <= endMinutes; at += durationMinutes) {
      const start = day.startOf('day').add(at, 'minute')
      if (!start.isAfter(now)) continue
      slots.push({ start: start.toDate(), end: start.add(durationMinutes, 'minute').toDate() })
    }
  })

  return slots
}

/** Inclusive of `start`, exclusive of `end` — matches FullCalendar's visible range. */
export const getSlotsForDateRange = ({
  weekSchedule,
  start,
  end,
  durationMinutes,
  now = new Date(),
}: {
  weekSchedule?: WeekSchedule
  start: Date
  end: Date
  durationMinutes: number
  now?: Date
}): BookingSlot[] => {
  const slots: BookingSlot[] = []
  let cursor = dayjs(start).startOf('day')
  const last = dayjs(end)

  while (cursor.isBefore(last)) {
    slots.push(...getSlotsForDate({ weekSchedule, date: cursor.toDate(), durationMinutes, now }))
    cursor = cursor.add(1, 'day')
  }

  return slots
}

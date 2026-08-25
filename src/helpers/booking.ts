import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
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

export type SlotGroup = { key: string; label: string; slots: BookingSlot[] }

/** Upper bound (exclusive) of each part of the day, in hours. */
const SLOT_GROUPS = [
  { key: 'morning', label: 'Morning', untilHour: 12 },
  { key: 'afternoon', label: 'Afternoon', untilHour: 17 },
  { key: 'evening', label: 'Evening', untilHour: 24 },
] as const

/**
 * One day's slots split into parts of the day, empty sections dropped.
 *
 * A day of 30-minute slots is 20+ chips; sections give the eye somewhere to land.
 */
export const groupSlotsByPartOfDay = (slots: BookingSlot[]): SlotGroup[] =>
  SLOT_GROUPS.map(({ key, label, untilHour }, index) => {
    const fromHour = index ? SLOT_GROUPS[index - 1].untilHour : 0
    return {
      key,
      label,
      slots: slots.filter((slot) => {
        const hour = dayjs(slot.start).hour()
        return hour >= fromHour && hour < untilHour
      }),
    }
  }).filter((group) => !!group.slots.length)

/** Slot counts keyed by day, for the month-view badges and the day-cell affordance. */
export const countSlotsByDay = (slots: BookingSlot[]): Map<string, number> => {
  const counts = new Map<string, number>()

  slots.forEach((slot) => {
    const key = dayjs(slot.start).format(DAY_KEY_FORMAT)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return counts
}

import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { DaySchedule, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { SLOT_TAKEN_MESSAGE } from '@constants/booking'
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

/** Whether this calendar date falls on a weekday the provider has hours for. */
export const isOpenOnDate = (weekSchedule: WeekSchedule | undefined, date: Date | Dayjs): boolean => {
  if (!weekSchedule) return false
  return hasAvailability(weekSchedule[getWeekDay(dayjs(date))])
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

/** Slot counts keyed by day, for the month-view badges and the day-cell affordance. */
export const countSlotsByDay = (slots: BookingSlot[]): Map<string, number> => {
  const counts = new Map<string, number>()

  slots.forEach((slot) => {
    const key = dayjs(slot.start).format(DAY_KEY_FORMAT)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return counts
}

/**
 * A booked interval, as the API sends it — see `ProviderBusyInterval`. Declared
 * structurally rather than imported so this module keeps importing nothing from
 * `@api/*`: the API layer may import helpers, never the other way round
 * (`src/api/CLAUDE.md`).
 */
export type BusyInterval = { startAt: string; endAt: string }

/**
 * Drops every slot that overlaps a booking already on the provider's calendar.
 *
 * This is the missing half of the booking grid. `getSlotsForDate` answers "when is this
 * provider open", which the panel used to render as if it meant "when can I book" —
 * so every visitor was shown every in-hours time as free, and the first they heard
 * otherwise was a `409` on submit (`docs/BACKLOG.md` #6).
 *
 * It subtracts rather than the server producing the slots directly, because a slot only
 * exists once a service duration is chosen and that is the visitor's pick. The server
 * owns which intervals are gone; the step stays here. **Overlap, not equality**: a
 * 30-minute slot at 10:00 is unbookable against a 45-minute booking at 09:30, and
 * comparing start times alone would offer it.
 *
 * `pending` bookings are in the busy set — a request awaiting the provider's approval
 * holds its time, or the second person to ask gets a slot that has to be refused.
 */
export const dropBusySlots = (slots: BookingSlot[], busy: BusyInterval[]): BookingSlot[] => {
  if (!busy.length) return slots

  const taken = busy
    .map(({ startAt, endAt }) => ({ start: new Date(startAt).getTime(), end: new Date(endAt).getTime() }))
    // An unparseable instant would compare `NaN` against everything and silently keep
    // every slot bookable, which is the one outcome worse than dropping too many.
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start)

  if (!taken.length) return slots

  return slots.filter((slot) => {
    const start = slot.start.getTime()
    const end = slot.end.getTime()
    return !taken.some((interval) => start < interval.end && interval.start < end)
  })
}

/**
 * Whether a failed booking write is "someone got there first" — the one failure the
 * visitor can fix themselves, by picking another time.
 *
 * Takes the `AppError` `processError` already produced rather than the raw throw, so it
 * cannot be handed an axios error one call site remembered to unwrap and another did
 * not. Both halves are checked: the status, because a matching message on a `500` is a
 * coincidence, and the message, because `POST /appointments` answers `409` for a
 * withdrawn service too and telling that visitor to choose another slot would send them
 * round a loop that cannot end.
 */
export const isSlotTakenError = (error: { code: number; message: string }): boolean =>
  error.code === 409 && error.message === SLOT_TAKEN_MESSAGE

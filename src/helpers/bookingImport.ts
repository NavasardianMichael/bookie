import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { WeekSchedule } from '@store/providers/profile/types'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT } from '@constants/schedule'
import { BookingSlot, BusyInterval, dropBusySlots, getSlotsForDate } from './booking'
import { inTimeZone, zonedTimeToDate } from './timeZone'

dayjs.extend(customParseFormat)

/**
 * The review sheet's slot rules for bookings read off a photo ("Add from photo" on
 * `/bookings`). The same engine as the public grid — `getSlotsForDate` steps the provider's
 * hours by the service's duration, `dropBusySlots` subtracts what is taken — so a time the
 * sheet accepts is a time a visitor could have booked, and nothing else.
 *
 * Pure and zone-explicit, like `booking.ts`: every function takes the provider's zone and
 * `now`, which is what lets `tests/unit/helpers/bookingImport.spec.ts` pin them.
 */

/** One row as the sheet holds it: the fields that decide a slot. `date` is `YYYY-MM-DD`, `time` `HH:mm`. */
export type DraftSlotRow = {
  serviceId?: string | null
  date?: string | null
  time?: string | null
}

/** What the slot rules need of the provider: their hours, their zone, each service's length. */
export type DraftSchedule = {
  weekSchedule?: WeekSchedule
  /** `Provider.timeZone`; absent reads the hours in the browser's zone, as the public grid does. */
  timeZone?: string
  /** Minutes per **active** service. A service missing here cannot be booked. */
  durations: Readonly<Record<string, number>>
}

/**
 * Why a row cannot be submitted as it stands, in the order it is checked — the first that
 * applies is the one worth telling the provider:
 *
 * - `missing` — no service, date or time yet.
 * - `offGrid` — not a slot this service's grid has on that day: outside the hours, on a
 *   closed day, in a break, or between two slot starts (`14:10` on a 30-minute grid).
 * - `past` — a real slot, already gone.
 * - `taken` — overlaps a booking already on the calendar.
 * - `clash` — overlaps an earlier row of this same sheet, which keeps the time.
 */
export type DraftSlotIssue = 'missing' | 'offGrid' | 'past' | 'taken' | 'clash'

export type DraftSlotCheck = { issue: DraftSlotIssue; clashWith?: number }

const toMinutes = (time: string): number | null => {
  const parsed = dayjs(time, SCHEDULE_VALUE_FORMAT, true)
  return parsed.isValid() ? parsed.hour() * 60 + parsed.minute() : null
}

/** A `YYYY-MM-DD` as the local-midnight carrier `getSlotsForDate` reads its day from. */
const dayCarrier = (dayKey: string): Date | null => {
  const day = dayjs(dayKey, DAY_KEY_FORMAT, true)
  return day.isValid() ? day.toDate() : null
}

/**
 * The instant a row starts: its wall-clock time on its day, in the provider's zone. `null`
 * until both are set and readable.
 */
export const draftStart = (row: DraftSlotRow, timeZone?: string): Date | null => {
  if (!row.date || !row.time) return null
  const minutes = toMinutes(row.time)
  const day = dayCarrier(row.date)
  if (minutes === null || !day) return null
  return timeZone ? zonedTimeToDate(row.date, minutes, timeZone) : dayjs(day).add(minutes, 'minute').toDate()
}

/** The interval a complete row would occupy, in the shape `dropBusySlots` subtracts. */
export const draftInterval = (row: DraftSlotRow, schedule: DraftSchedule): BusyInterval | null => {
  const duration = row.serviceId ? schedule.durations[row.serviceId] : undefined
  const start = draftStart(row, schedule.timeZone)
  if (!duration || !start) return null
  return { startAt: start.toISOString(), endAt: new Date(start.getTime() + duration * 60_000).toISOString() }
}

/** The other rows' intervals, each tagged with its index so a clash can name its partner. */
const otherIntervals = (rows: readonly DraftSlotRow[], index: number, schedule: DraftSchedule) =>
  rows.flatMap((row, otherIndex) => {
    if (otherIndex === index) return []
    const interval = draftInterval(row, schedule)
    return interval ? [{ ...interval, index: otherIndex }] : []
  })

/**
 * Whether row `index` sits on a free slot, and if not, why. `null` means it may be submitted.
 * `busy` is the calendar's live bookings around the row's day (`GET /providers/:id/busy`).
 */
export const checkDraftSlot = ({
  rows,
  index,
  schedule,
  busy,
  now = new Date(),
}: {
  rows: readonly DraftSlotRow[]
  index: number
  schedule: DraftSchedule
  busy: readonly BusyInterval[]
  now?: Date
}): DraftSlotCheck | null => {
  const row = rows[index]
  const duration = row?.serviceId ? schedule.durations[row.serviceId] : undefined
  const start = row ? draftStart(row, schedule.timeZone) : null
  const day = row?.date ? dayCarrier(row.date) : null
  if (!row || !duration || !start || !day) return { issue: 'missing' }

  // `now: new Date(0)` is the whole day's grid, past slots included — so a time that was a
  // real slot this morning reads as `past`, not as `offGrid`.
  const grid = getSlotsForDate({
    weekSchedule: schedule.weekSchedule,
    date: day,
    durationMinutes: duration,
    now: new Date(0),
    timeZone: schedule.timeZone,
  })
  const slot = grid.find((candidate) => candidate.start.getTime() === start.getTime())
  if (!slot) return { issue: 'offGrid' }
  if (slot.start.getTime() <= now.getTime()) return { issue: 'past' }
  if (!dropBusySlots([slot], [...busy]).length) return { issue: 'taken' }

  // Only against *earlier* rows: of two rows on one time, the first keeps it and the later is
  // the one to move — flagging both would also accuse the row that was read right.
  const clash = otherIntervals(rows, index, schedule).find(
    (other) => other.index < index && !dropBusySlots([slot], [other]).length
  )
  return clash ? { issue: 'clash', clashWith: clash.index } : null
}

/**
 * The times row `index` may move to: its service's slots on its day that are still ahead,
 * not taken on the calendar, and not held by another row. `HH:mm` on the provider's clock,
 * in order — values, not labels; the sheet formats them on the provider's 12/24-hour clock.
 */
export const draftTimeOptions = ({
  rows,
  index,
  schedule,
  busy,
  now = new Date(),
}: {
  rows: readonly DraftSlotRow[]
  index: number
  schedule: DraftSchedule
  busy: readonly BusyInterval[]
  now?: Date
}): string[] => {
  const row = rows[index]
  const duration = row?.serviceId ? schedule.durations[row.serviceId] : undefined
  const day = row?.date ? dayCarrier(row.date) : null
  if (!duration || !day) return []

  const slots: BookingSlot[] = getSlotsForDate({
    weekSchedule: schedule.weekSchedule,
    date: day,
    durationMinutes: duration,
    now,
    timeZone: schedule.timeZone,
  })
  const held = otherIntervals(rows, index, schedule).map(({ startAt, endAt }) => ({ startAt, endAt }))
  return dropBusySlots(slots, [...busy, ...held]).map((slot) =>
    inTimeZone(slot.start, schedule.timeZone).format(SCHEDULE_VALUE_FORMAT)
  )
}

/**
 * A time option's label: its `HH:mm` value printed in `displayFormat`
 * (`getTimeDisplayFormat`, the provider's 12/24-hour clock). Client-only, like that format.
 */
export const formatDraftTime = (time: string, displayFormat: string): string => {
  const parsed = dayjs(time, SCHEDULE_VALUE_FORMAT, true)
  return parsed.isValid() ? parsed.format(displayFormat) : time
}

/**
 * The months whose bookings the sheet needs, as `YYYY-MM` — one busy read per month the rows
 * fall in, the window `BookingPanel` reads for the month it shows.
 */
export const draftMonths = (rows: readonly DraftSlotRow[]): string[] =>
  [...new Set(rows.flatMap((row) => (row.date && dayCarrier(row.date) ? [row.date.slice(0, 7)] : [])))].sort()

/**
 * The busy window for one `YYYY-MM`, padded a day either side — a booking near midnight in
 * the provider's zone can fall on the browser's neighbouring day. 33 days at most, well
 * inside the API's 100-day cap.
 */
export const draftMonthWindow = (month: string): { from: string; to: string } => {
  const start = dayjs(`${month}-01`, DAY_KEY_FORMAT, true)
  return {
    from: start.subtract(1, 'day').toISOString(),
    to: start.add(1, 'month').add(1, 'day').toISOString(),
  }
}

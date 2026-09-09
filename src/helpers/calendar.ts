import dayjs, { Dayjs } from 'dayjs'
import { DAY_KEY_FORMAT } from '@constants/schedule'

/**
 * Month-grid geometry, shared by the two calendars in the app.
 *
 * Only the cell *maths* is shared, not the markup. `BookingMonth` disables days with no
 * open slots and refuses to page into the past; the provider's booking history does
 * neither and badges each day with a count instead. One component covering both would be
 * a props explosion, whereas the grid arithmetic is identical and easy to get subtly
 * wrong — which is why it lives here with a spec rather than being copied.
 */

/** Monday-first, matching `WEEK_DAYS_LIST` and every schedule in the app. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export type MonthCell = {
  /** `DAY_KEY_FORMAT` (`YYYY-MM-DD`) — the key days travel as everywhere in the app. */
  key: string
  date: Dayjs
  /** A leading or trailing day borrowed from the neighbouring month to square the grid. */
  isOutside: boolean
}

/**
 * Every cell of the month grid containing `month`, padded to whole weeks.
 *
 * Always a multiple of 7, so the grid keeps its weekday columns: a month that starts on
 * a Sunday and runs 31 days needs six rows, and one that starts on a Monday and runs 28
 * needs four. Outside days are returned rather than left blank — a caller that wants them
 * invisible can style them, but dropping them would shift every subsequent cell out of
 * its column.
 */
export const buildMonthCells = (month: Dayjs): MonthCell[] => {
  const start = month.startOf('month')
  // dayjs `day()` is Sunday-first; shift so Monday is column 0.
  const leading = (start.day() + 6) % 7
  const gridStart = start.subtract(leading, 'day')
  const total = Math.ceil((leading + month.daysInMonth()) / 7) * 7

  return Array.from({ length: total }, (_, index) => {
    const date = gridStart.add(index, 'day')
    return { key: date.format(DAY_KEY_FORMAT), date, isOutside: !date.isSame(start, 'month') }
  })
}

/**
 * Weekday column headers in grid order, localised by dayjs's active locale.
 *
 * **Client-only**, like everything that reads `dayjs.locale()`. The locale is a module
 * global set once from `App.tsx`; calling this on the server would let two concurrent
 * requests in different languages race. See `src/i18n/CLAUDE.md`.
 */
export const buildWeekdayLabels = (format = 'ddd'): { day: number; label: string }[] =>
  WEEKDAY_ORDER.map((day) => ({ day, label: dayjs().day(day).format(format) }))

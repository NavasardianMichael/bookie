import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { DaySchedulePart } from '@store/providers/profile/types'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT } from '@constants/schedule'

dayjs.extend(customParseFormat)

/**
 * How the hours screens print a run of dates and a day's windows — shared by the dates editor and
 * the dialog that confirms a change of hours, so both read the same. Client-only: dayjs prints in
 * the active locale (`dayjs.locale()` is a module global).
 */

/** `Mon, 9 Mar 2026`, or `9 Mar – 12 Mar 2026` for a run. */
export const formatDateSpan = (from: string, to: string = from): string => {
  const start = dayjs(from, DAY_KEY_FORMAT)
  if (from === to) return start.format('ddd, D MMM YYYY')
  return `${start.format('D MMM')} – ${dayjs(to, DAY_KEY_FORMAT).format('D MMM YYYY')}`
}

/** `09:00–12:00, 13:00–17:00` on the given display pattern (`getTimeDisplayFormat`). */
export const formatParts = (parts: readonly DaySchedulePart[], displayFormat: string): string =>
  parts
    .map(
      (part) =>
        `${dayjs(part.start, SCHEDULE_VALUE_FORMAT).format(displayFormat)}–${dayjs(part.end, SCHEDULE_VALUE_FORMAT).format(displayFormat)}`
    )
    .join(', ')

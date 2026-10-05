import { toTimeZone } from './time-zone.js'

/**
 * A provider's clock — `Provider.timeFormat` — as the API validates it and prints with it.
 *
 * Imports only `time-zone.ts`, which imports nothing, so `tests/unit/server/` can reach it.
 * The browser twin is `src/helpers/timeFormat.ts`.
 */

/** Mirrors the Prisma `TimeFormat` enum; `h12`/`h24` because an enum value cannot start with a digit. */
export const TIME_FORMATS = ['h12', 'h24'] as const

export type TimeFormat = (typeof TIME_FORMATS)[number]

/** `raw` when it is one of `TIME_FORMATS`, otherwise `null`. */
export function toTimeFormat(raw: unknown): TimeFormat | null {
  return TIME_FORMATS.find((format) => format === raw) ?? null
}

/**
 * The `Intl` hour cycle for a stored format. `undefined` for a provider who never chose, so
 * the formatter's locale decides, as it did before the column existed. `h23` rather than
 * `h24`: the latter prints midnight as 24:00.
 */
export function hourCycleOf(timeFormat?: TimeFormat | null): 'h12' | 'h23' | undefined {
  if (timeFormat === 'h24') return 'h23'
  if (timeFormat === 'h12') return 'h12'
  return undefined
}

/**
 * A booking's start as an email or Telegram notice prints it: in the **provider's** zone and
 * on the **provider's** clock, and naming the zone.
 *
 * Without `timeZone` this formatted in the API process's own zone — UTC in production — so
 * a 10:00 appointment in Yerevan was mailed to both sides as 6:00 AM. The zone name is
 * always printed (`GMT+4`, or `UTC` for a provider who has not set one), because an email
 * is read away from the page that would otherwise say which clock it means. Without
 * `timeFormat` the English default, 12-hour, applies.
 */
export const formatBookingWhen = (
  startAt: Date,
  timeZone?: string | null,
  timeFormat?: TimeFormat | null
): string =>
  new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: hourCycleOf(timeFormat),
    timeZone: toTimeZone(timeZone) ?? 'UTC',
    timeZoneName: 'short',
  }).format(startAt)

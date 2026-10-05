import { TimeFormat } from '@interfaces/schedule'

/**
 * A provider's clock — `details.timeFormat`, chosen beside their time zone on the Availability
 * tab — and how every time shown for them is formatted with it: the public page's hours and
 * slots, the booking summary, the manage link, and the provider's own workspace.
 *
 * `undefined` means the provider never chose, and each reader's locale decides
 * (`resolveTimeFormat`). The server twin is `server/src/lib/time-format.ts`, which prints the
 * same choice into emails and Telegram notices.
 */

const localeFormats = new Map<string, TimeFormat>()

/** The clock `locale` uses by default — `en` 12-hour, `hy`, `de` or `ru` 24-hour — from `Intl`'s CLDR data. */
export const getLocaleTimeFormat = (locale: string): TimeFormat => {
  let format = localeFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ? 'h12' : 'h24'
    localeFormats.set(locale, format)
  }
  return format
}

/** The provider's choice, or `locale`'s convention for a provider who never made one. */
export const resolveTimeFormat = (timeFormat: TimeFormat | null | undefined, locale: string): TimeFormat =>
  timeFormat ?? getLocaleTimeFormat(locale)

/**
 * The dayjs pattern for a time of day on that clock: `09:30 PM` or `21:30`. Also an antd
 * `TimePicker` `format`. The 12-hour pattern keeps the meridiem so typed input is unambiguous;
 * it is printed in the active dayjs locale, so client-side only.
 */
export const getTimeDisplayFormat = (timeFormat: TimeFormat): string => (timeFormat === 'h24' ? 'HH:mm' : 'hh:mm A')

/**
 * The `hourCycle` option for an `Intl` / next-intl formatter. `undefined` leaves the locale's
 * convention, which is exactly what a provider who never chose gets. `h23` rather than `h24`:
 * the latter prints midnight as 24:00.
 */
export const getHourCycle = (timeFormat?: TimeFormat | null): 'h12' | 'h23' | undefined =>
  timeFormat === 'h24' ? 'h23' : timeFormat === 'h12' ? 'h12' : undefined

/**
 * A schedule's wall-clock `'HH:mm'` as a `Date` whose **UTC** fields read that time, for an
 * `Intl` formatter given `timeZone: 'UTC'` — how a Server Component prints opening hours,
 * since `dayjs.locale()` is client-only. A carrier for a time of day, not an instant.
 */
export const scheduleTimeToDate = (value: string): Date => {
  const [hours, minutes] = value.split(':').map(Number)
  return new Date(Date.UTC(2000, 0, 1, hours || 0, minutes || 0))
}

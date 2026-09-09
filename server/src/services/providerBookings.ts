import type { Prisma } from '@prisma/client'

/**
 * The provider bookings tab's query contract: what `GET /provider-profile/bookings`
 * accepts, and the Prisma `where` / `orderBy` / window it turns into.
 *
 * Same shape and same reasoning as `providerSearch.ts` — parsing lives here so the
 * route stays a thin delegate and so this is unit-testable with no database. Every
 * accepted value is narrowed into a closed set, so a hand-edited query string
 * degrades to the default rather than reaching Prisma.
 *
 * The provider id is **not** a query parameter. It comes off the session in the route,
 * which is what makes this endpoint incapable of reading another provider's calendar.
 */

export const BOOKINGS_PAGE_SIZE = 20
const BOOKINGS_MAX_PAGE_SIZE = 100

/** Matches `SEARCH_TERM_LIMIT` in `providerSearch.ts` — same OR-fan-out concern. */
const SEARCH_TERM_LIMIT = 5

/**
 * Mirrors the `AppointmentStatus` enum. Declared rather than imported from
 * `@prisma/client` so the list can be iterated and so a schema change that drops a
 * value fails the type check here instead of silently widening the filter.
 */
export const BOOKING_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const isBookingStatus = (raw: unknown): raw is BookingStatus =>
  BOOKING_STATUSES.includes(raw as BookingStatus)

export type ProviderBookingsSort = 'startDesc' | 'startAsc' | 'createdDesc' | 'nameAsc'

/**
 * `startDesc` is the default because this is a *history* view — the most recent thing
 * that happened is what a provider opens it to see. The public booking flow's
 * `GET /appointments` sorts ascending for the opposite reason: it answers "what is
 * coming up".
 *
 * `nameAsc` orders on the Consumer relation first, which puts guest bookings — where
 * that relation is null and Postgres sorts nulls last on an ascending order — together
 * at the end, ordered among themselves by `guestLastName`. Two keys are needed because
 * a booker's name lives in one of two places depending on whether they had an account.
 * Only `guestLastName` takes an explicit `nulls`; `Consumer.lastName` is non-nullable,
 * so Prisma does not accept the modifier there.
 */
const ORDER_BY: Record<ProviderBookingsSort, Prisma.AppointmentOrderByWithRelationInput[]> = {
  startDesc: [{ startAt: 'desc' }],
  startAsc: [{ startAt: 'asc' }],
  createdDesc: [{ createdAt: 'desc' }],
  nameAsc: [{ consumer: { lastName: 'asc' } }, { guestLastName: { sort: 'asc', nulls: 'last' } }],
}

export const PROVIDER_BOOKINGS_SORTS = Object.keys(ORDER_BY) as ProviderBookingsSort[]

type RawQuery = Record<string, unknown>

const asString = (raw: unknown): string => (typeof raw === 'string' ? raw : '')

const asSort = (raw: unknown): ProviderBookingsSort =>
  PROVIDER_BOOKINGS_SORTS.find((sort) => sort === raw) ?? 'startDesc'

const asPositiveInt = (raw: unknown, fallback: number, max: number): number => {
  const parsed = Number.parseInt(asString(raw), 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

/**
 * A date bound, as either `YYYY-MM-DD` or a full ISO timestamp. An unparseable value
 * is dropped rather than throwing: a bad `?from=` should show the unfiltered list, not
 * a 400 on a screen the provider did not ask a question of.
 */
const asDate = (raw: unknown): Date | undefined => {
  const value = asString(raw).trim()
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * Express gives a repeated `?status=a&status=b` as an array and a single one as a
 * string. Both are accepted; anything outside the enum is dropped, and dropping every
 * value means no status filter rather than a filter matching nothing.
 */
const asStatuses = (raw: unknown): BookingStatus[] => {
  const values = Array.isArray(raw) ? raw : [raw]
  return [...new Set(values.filter(isBookingStatus))]
}

const toSearchTerms = (raw: unknown): string[] =>
  asString(raw).trim().split(/\s+/).filter(Boolean).slice(0, SEARCH_TERM_LIMIT)

/**
 * Where one term is allowed to match: whoever booked, under either identity. A guest
 * booking carries its own name columns and a signed-in one carries a Consumer relation,
 * so a provider searching "sarah" has to hit both or half their calendar is unsearchable.
 *
 * Guest email is included because it is often the only durable handle on a guest; the
 * consumer's email is not, because a provider searching by name should not be able to
 * probe for which addresses have accounts.
 */
const matchesTerm = (term: string): Prisma.AppointmentWhereInput => ({
  OR: [
    { consumer: { firstName: { contains: term, mode: 'insensitive' } } },
    { consumer: { lastName: { contains: term, mode: 'insensitive' } } },
    { guestFirstName: { contains: term, mode: 'insensitive' } },
    { guestLastName: { contains: term, mode: 'insensitive' } },
    { guestEmail: { contains: term, mode: 'insensitive' } },
    { service: { name: { contains: term, mode: 'insensitive' } } },
  ],
})

export type ProviderBookingsQuery = {
  where: Prisma.AppointmentWhereInput
  orderBy: Prisma.AppointmentOrderByWithRelationInput[]
  /** 1-based, as requested. Clamped against the real page count by `resolvePageWindow`. */
  page: number
  perPage: number
}

export function parseProviderBookingsQuery(providerId: string, query: RawQuery): ProviderBookingsQuery {
  const terms = toSearchTerms(query.q)
  const statuses = asStatuses(query.status)
  const serviceId = asString(query.serviceId)
  const from = asDate(query.from)
  const to = asDate(query.to)

  return {
    where: {
      // Always first and never overridable: everything below narrows within one
      // provider's own bookings.
      providerId,
      // Terms live under `AND` so they cannot collide with the `service` key a term
      // owns, and so a two-word search narrows instead of widening.
      ...(terms.length ? { AND: terms.map(matchesTerm) } : {}),
      ...(statuses.length ? { status: { in: statuses } } : {}),
      ...(serviceId ? { serviceId } : {}),
      ...(from || to ? { startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: ORDER_BY[asSort(query.sort)],
    page: asPositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER),
    perPage: asPositiveInt(query.perPage, BOOKINGS_PAGE_SIZE, BOOKINGS_MAX_PAGE_SIZE),
  }
}

/**
 * The UTC instants bounding one calendar month **as seen in `timeZone`**.
 *
 * `startAt` is stored in UTC but a provider reads their calendar in local time, so a
 * month cannot be bounded by `Date.UTC`: for anyone east of Greenwich the first hours
 * of the 1st are still the previous month in UTC, and those bookings would be missing
 * from the grid that shows them.
 *
 * Returns a half-open range — `[start, end)` — so the last millisecond of the month
 * cannot fall through the gap that an inclusive `lte` on a truncated bound leaves.
 */
export function monthRangeInZone(month: string, timeZone: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return null

  return {
    start: zonedDateToUtc(year, monthIndex, 1, timeZone),
    end: zonedDateToUtc(monthIndex === 11 ? year + 1 : year, (monthIndex + 1) % 12, 1, timeZone),
  }
}

/**
 * The UTC instant of local midnight on a given calendar date in `timeZone`.
 *
 * There is no `Date` constructor that takes a zone, and the server's own `TZ` is not
 * the provider's. The trick is to ask `Intl` what the UTC guess *renders as* in the
 * target zone and subtract the difference.
 *
 * Measured twice, deliberately. The first offset is read at the guess, which can sit on
 * the other side of a DST transition from the answer — a zone that springs forward at
 * midnight on the 1st would otherwise land the month boundary an hour out. Re-measuring
 * at the candidate converges, because the second reading is taken at an instant within
 * an hour of the true one and no zone changes offset twice inside that window.
 */
function zonedDateToUtc(year: number, monthIndex: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, monthIndex, day, 0, 0, 0, 0)
  const candidate = new Date(guess - zoneOffsetMs(new Date(guess), timeZone))
  return new Date(guess - zoneOffsetMs(candidate, timeZone))
}

/**
 * How far ahead of UTC `timeZone` is at `instant`, in milliseconds. Positive east of
 * Greenwich. `'shortOffset'` is not used because Node's ICU spells it inconsistently
 * across versions; formatting the parts and re-reading them as UTC is stable.
 */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  // `hour12: false` renders midnight as 24 in some ICU builds; `% 24` normalises it.
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour') % 24, read('minute'), read('second'))

  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * A valid IANA zone name, or `'UTC'`.
 *
 * The zone arrives from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
 * and is fed to `Intl`, so it is validated rather than trusted — an unknown name makes
 * `DateTimeFormat` throw, and a throw here would take down a whole calendar over a
 * query parameter.
 */
export function asTimeZone(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return value
  } catch {
    return 'UTC'
  }
}

/**
 * `YYYY-MM-DD` for an instant as seen in `timeZone` — the same `DAY_KEY_FORMAT` the
 * client's calendar keys its cells on, so the counts this produces can be looked up
 * directly by the grid without either side parsing a date.
 */
export function dayKeyInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${read('year')}-${read('month')}-${read('day')}`
}

/** A booking that still stands, as opposed to one that was cancelled or missed. */
const LIVE_STATUSES: readonly string[] = ['scheduled', 'confirmed', 'completed']

export type DayBookingCount = {
  /** Every booking on the day, whatever its status. */
  total: number
  /** Of those, the ones that were not cancelled or no-showed. */
  live: number
}

/**
 * Booking counts per `YYYY-MM-DD` key, for the calendar's badges.
 *
 * Cancelled and no-show bookings are counted in `total` rather than dropped: a day that
 * filled up and then emptied is information, and hiding them would make the grid
 * disagree with the list underneath it whenever the status filter is cleared. `live`
 * is what the badge shows; `total` is what makes the day selectable.
 */
export function countBookingsByDay(
  bookings: { startAt: Date; status: string }[],
  timeZone: string
): Record<string, DayBookingCount> {
  const counts: Record<string, DayBookingCount> = {}

  for (const booking of bookings) {
    const key = dayKeyInZone(booking.startAt, timeZone)
    const bucket = (counts[key] ??= { total: 0, live: 0 })
    bucket.total += 1
    if (LIVE_STATUSES.includes(booking.status)) bucket.live += 1
  }

  return counts
}

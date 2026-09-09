import type { Prisma } from '@prisma/client'
import { dayKeyInZone, zoneOffsetMs } from './providerBookings.js'

/**
 * The provider analytics tab: what `GET /provider-profile/analytics` accepts, and how a
 * flat list of appointments becomes the tiles, series and breakdowns the page renders.
 *
 * Two shapes here are deliberate and worth not undoing.
 *
 * **Bucketed in the caller's timezone, not UTC.** `startAt` is stored in UTC and
 * `Provider` carries no timezone column, so bucketing by the raw instant puts an evening
 * booking on the following day for anyone east of Greenwich and the previous one for
 * anyone far enough west. The client sends its IANA zone; every day, weekday and hour
 * bucket below is resolved through it.
 *
 * **Bucketed in memory, not in SQL.** `date_trunc(... AT TIME ZONE ...)` would be faster
 * and would need a live database to test, which this repo has no fixtures for. One
 * provider's bookings over the longest offered range (12 months) is a few thousand rows
 * at most, selected down to seven columns. The tipping point is somewhere around a
 * provider taking hundreds of bookings a day; past that this wants the raw query and the
 * DB-backed test suite `docs/BACKLOG.md` already asks for.
 */

/** What the range presets on the page resolve to. Clamped so a hand-edited value cannot ask for a decade. */
const MAX_RANGE_DAYS = 366
const DEFAULT_RANGE_DAYS = 30

/** Counted as revenue and as a delivered appointment. */
const COMPLETED: readonly string[] = ['completed']
/** Counted as a booking that stood, whether or not it has happened yet. */
const LIVE: readonly string[] = ['scheduled', 'confirmed', 'completed']

/** Only the columns the maths needs — the point of not loading whole appointments. */
export const ANALYTICS_SELECT = {
  startAt: true,
  createdAt: true,
  status: true,
  serviceId: true,
  price: true,
  currency: true,
  consumerId: true,
  guestEmail: true,
} satisfies Prisma.AppointmentSelect

/**
 * What the maths needs of a price: something `Number()` can read.
 *
 * Declared structurally rather than as `Prisma.Decimal` so this module needs nothing
 * from the generated client **at runtime** — `tests/unit/server/` imports these services
 * by relative path from the root package, which cannot resolve `@prisma/client`. Prisma's
 * `Decimal` satisfies it, and so does a plain number in a test.
 */
export type PriceLike = { toString(): string }

export type AnalyticsRow = {
  startAt: Date
  createdAt: Date
  status: string
  serviceId: string
  price: PriceLike | null
  currency: string | null
  consumerId: string | null
  guestEmail: string | null
}

export type AnalyticsRange = {
  /** Inclusive. */
  from: Date
  /** Exclusive, so the last day of the range cannot fall through a truncated bound. */
  to: Date
  /** The equal-length window immediately before `from`, for the delta on each tile. */
  previousFrom: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

const asString = (raw: unknown): string => (typeof raw === 'string' ? raw : '')

const asDate = (raw: unknown): Date | undefined => {
  const value = asString(raw).trim()
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * The window to report on, plus the equal-length window before it.
 *
 * `now` is a parameter rather than a `new Date()` call inside, which is the one clock
 * seam convention this codebase holds to (`src/helpers/booking.ts` does the same) and
 * the only reason the tests below can be deterministic.
 */
export function parseAnalyticsRange(query: Record<string, unknown>, now: Date): AnalyticsRange {
  const to = asDate(query.to) ?? now
  const requestedFrom = asDate(query.from)

  const earliest = new Date(to.getTime() - MAX_RANGE_DAYS * DAY_MS)
  const fallback = new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)

  // A `from` after `to`, or one further back than the cap, resolves to the default
  // rather than erroring: this is a dashboard, and an unreadable query string should
  // show the usual month, not a 400.
  const from =
    requestedFrom && requestedFrom < to && requestedFrom >= earliest ? requestedFrom : fallback

  return {
    from,
    to,
    previousFrom: new Date(from.getTime() - (to.getTime() - from.getTime())),
  }
}

export type CurrencyTotal = { currency: string; total: number }

export type AnalyticsTotals = {
  bookings: number
  completed: number
  cancelled: number
  noShow: number
  /**
   * Never one number. `Service.currency` is free-form text, so a provider with prices
   * in two currencies has no single total — summing them would be a wrong answer, not
   * an approximate one. Sorted by size so the page can lead with the dominant currency
   * and say plainly that there is more than one.
   */
  revenue: CurrencyTotal[]
}

export type AnalyticsRates = {
  /** Of the bookings whose outcome is settled. Null when none are, rather than 0%. */
  completion: number | null
  cancellation: number | null
  noShow: number | null
}

export type ProviderAnalytics = {
  range: { from: string; to: string }
  timeZone: string
  totals: AnalyticsTotals
  /** The same totals over the equal-length window before the range, for deltas. */
  previous: AnalyticsTotals
  rates: AnalyticsRates
  /** One entry per day in the range, zero-filled, so a chart has no gaps to interpolate. */
  series: { day: string; bookings: number; completed: number }[]
  topServices: { serviceId: string; bookings: number; revenue: CurrencyTotal[] }[]
  /** Monday-first, matching every other weekday list in the app. */
  byWeekday: { weekday: number; bookings: number }[]
  byHour: { hour: number; bookings: number }[]
  clients: { total: number; returning: number }
  /** Median hours between booking and appointment. Null when the range is empty. */
  medianLeadTimeHours: number | null
}

/** A price to whole minor units, so a sum of decimals cannot drift on floats. */
const toMinorUnits = (price: PriceLike | null): number => (price ? Math.round(Number(price) * 100) : 0)

const sumRevenue = (rows: AnalyticsRow[]): CurrencyTotal[] => {
  const byCurrency = new Map<string, number>()

  for (const row of rows) {
    if (!COMPLETED.includes(row.status) || !row.price) continue
    // A priced service with no currency set is still revenue; grouping it under a
    // visible placeholder is better than dropping it and under-reporting the total.
    const currency = row.currency?.trim() || '—'
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + toMinorUnits(row.price))
  }

  return [...byCurrency]
    .map(([currency, minor]) => ({ currency, total: minor / 100 }))
    .sort((a, b) => b.total - a.total)
}

const totalsOf = (rows: AnalyticsRow[]): AnalyticsTotals => ({
  bookings: rows.length,
  completed: rows.filter((row) => row.status === 'completed').length,
  cancelled: rows.filter((row) => row.status === 'cancelled').length,
  noShow: rows.filter((row) => row.status === 'no_show').length,
  revenue: sumRevenue(rows),
})

/**
 * Rates are taken over *settled* bookings only — completed, cancelled or no-showed.
 * Dividing by every booking in the range would make a completion rate fall simply
 * because next week is filling up, which reads as a problem where there is none.
 */
const ratesOf = (totals: AnalyticsTotals): AnalyticsRates => {
  const settled = totals.completed + totals.cancelled + totals.noShow
  if (!settled) return { completion: null, cancellation: null, noShow: null }

  return {
    completion: totals.completed / settled,
    cancellation: totals.cancelled / settled,
    noShow: totals.noShow / settled,
  }
}

/**
 * Every `YYYY-MM-DD` from `from` to `to`, in `timeZone`, so the series has no holes for
 * a chart to interpolate across.
 *
 * Sampled every **12 hours**, not every 24. A 24-hour step from a local-midnight anchor
 * drifts an hour at each DST transition, and once it has drifted backwards past midnight
 * a single step can skip a local day entirely — a missing bar that looks like a day with
 * no bookings. Half-day sampling cannot miss a day whatever the offset does; the
 * duplicates it produces collapse in the Set, and `YYYY-MM-DD` sorts chronologically as
 * a plain string.
 */
const dayKeysBetween = (from: Date, to: Date, timeZone: string): string[] => {
  const keys = new Set<string>()
  const halfDay = DAY_MS / 2
  // Bounds the loop against a nonsense range that slipped past `parseAnalyticsRange`;
  // the range cap itself is enforced there, not here.
  const maxSteps = MAX_RANGE_DAYS * 2 + 4

  let cursor = from.getTime()
  for (let step = 0; cursor <= to.getTime() && step < maxSteps; step += 1) {
    keys.add(dayKeyInZone(new Date(cursor), timeZone))
    cursor += halfDay
  }
  keys.add(dayKeyInZone(to, timeZone))

  return [...keys].sort()
}

/** Local wall-clock parts of an instant, as seen in `timeZone`. */
const localPartsOf = (instant: Date, timeZone: string): { weekday: number; hour: number } => {
  const shifted = new Date(instant.getTime() + zoneOffsetMs(instant, timeZone))
  // Monday-first, matching `WEEK_DAYS_LIST` and every schedule in the app.
  return { weekday: (shifted.getUTCDay() + 6) % 7, hour: shifted.getUTCHours() }
}

const medianOf = (values: number[]): number | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * A booker's identity for the new-vs-returning split.
 *
 * `consumerId` where there is one, guest email otherwise — the same fallback the guest
 * booking flow uses to recognise someone. A guest with no email is counted as its own
 * one-off client rather than merged with every other anonymous booking.
 */
const bookerKeyOf = (row: AnalyticsRow, index: number): string =>
  row.consumerId ?? (row.guestEmail ? `guest:${row.guestEmail.toLowerCase()}` : `anon:${index}`)

export function buildProviderAnalytics(
  rows: AnalyticsRow[],
  previousRows: AnalyticsRow[],
  range: AnalyticsRange,
  timeZone: string
): ProviderAnalytics {
  const totals = totalsOf(rows)

  const perDay = new Map<string, { bookings: number; completed: number }>()
  const perService = new Map<string, AnalyticsRow[]>()
  const perWeekday = new Array<number>(7).fill(0)
  const perHour = new Array<number>(24).fill(0)
  const bookerCounts = new Map<string, number>()
  const leadTimes: number[] = []

  rows.forEach((row, index) => {
    const dayKey = dayKeyInZone(row.startAt, timeZone)
    const day = perDay.get(dayKey) ?? { bookings: 0, completed: 0 }
    day.bookings += 1
    if (row.status === 'completed') day.completed += 1
    perDay.set(dayKey, day)

    perService.set(row.serviceId, [...(perService.get(row.serviceId) ?? []), row])

    // Weekday and hour describe *demand*, so only bookings that stood are counted —
    // a cancelled 6am slot is not evidence anyone wants a 6am slot.
    if (LIVE.includes(row.status)) {
      const { weekday, hour } = localPartsOf(row.startAt, timeZone)
      perWeekday[weekday] += 1
      perHour[hour] += 1
    }

    const key = bookerKeyOf(row, index)
    bookerCounts.set(key, (bookerCounts.get(key) ?? 0) + 1)

    const lead = (row.startAt.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000)
    // A negative lead time means a booking logged after the fact; it says nothing
    // about how far ahead people book, so it is left out rather than dragging the
    // median toward zero.
    if (lead >= 0) leadTimes.push(lead)
  })

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    timeZone,
    totals,
    previous: totalsOf(previousRows),
    rates: ratesOf(totals),
    series: dayKeysBetween(range.from, range.to, timeZone).map((day) => ({
      day,
      bookings: perDay.get(day)?.bookings ?? 0,
      completed: perDay.get(day)?.completed ?? 0,
    })),
    topServices: [...perService]
      .map(([serviceId, serviceRows]) => ({
        serviceId,
        bookings: serviceRows.length,
        revenue: sumRevenue(serviceRows),
      }))
      .sort((a, b) => b.bookings - a.bookings),
    byWeekday: perWeekday.map((bookings, weekday) => ({ weekday, bookings })),
    byHour: perHour.map((bookings, hour) => ({ hour, bookings })),
    clients: {
      total: bookerCounts.size,
      returning: [...bookerCounts.values()].filter((count) => count > 1).length,
    },
    medianLeadTimeHours: medianOf(leadTimes),
  }
}

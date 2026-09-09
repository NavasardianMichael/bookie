import { describe, expect, it } from 'vitest'
import {
  type AnalyticsRow,
  buildProviderAnalytics,
  parseAnalyticsRange,
} from '../../../server/src/services/providerAnalytics'

/**
 * The analytics aggregate. Every number the tab shows is computed here from a flat list
 * of appointments, so this is where a wrong answer would be invisible and expensive.
 *
 * `now` is injected everywhere, matching the clock-seam convention in
 * `src/helpers/booking.ts` — nothing below depends on the wall clock.
 */

const NOW = new Date('2026-09-15T12:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

const row = (over: Partial<AnalyticsRow> = {}): AnalyticsRow => ({
  startAt: new Date('2026-09-10T09:00:00Z'),
  createdAt: new Date('2026-09-08T09:00:00Z'),
  status: 'completed',
  serviceId: 'service-1',
  price: 20.00,
  currency: 'USD',
  consumerId: 'consumer-1',
  guestEmail: null,
  ...over,
})

const build = (rows: AnalyticsRow[], previous: AnalyticsRow[] = [], timeZone = 'UTC') =>
  buildProviderAnalytics(rows, previous, parseAnalyticsRange({}, NOW), timeZone)

describe('parseAnalyticsRange', () => {
  it('defaults to the last 30 days ending now', () => {
    const range = parseAnalyticsRange({}, NOW)
    expect(range.to).toEqual(NOW)
    expect(range.from).toEqual(new Date(NOW.getTime() - 30 * DAY_MS))
  })

  it('gives the previous window the same length, immediately before', () => {
    const range = parseAnalyticsRange({ from: new Date(NOW.getTime() - 7 * DAY_MS).toISOString() }, NOW)
    expect(range.to.getTime() - range.from.getTime()).toBe(7 * DAY_MS)
    expect(range.from.getTime() - range.previousFrom.getTime()).toBe(7 * DAY_MS)
  })

  it('falls back to the default rather than erroring on a nonsense window', () => {
    // A dashboard with an unreadable query string should show the usual month, not a 400.
    const after = parseAnalyticsRange({ from: '2027-01-01T00:00:00Z' }, NOW)
    expect(after.from).toEqual(new Date(NOW.getTime() - 30 * DAY_MS))

    const unparseable = parseAnalyticsRange({ from: 'yesterday-ish' }, NOW)
    expect(unparseable.from).toEqual(new Date(NOW.getTime() - 30 * DAY_MS))
  })

  it('caps how far back a hand-edited range can ask for', () => {
    const decade = parseAnalyticsRange({ from: '2016-01-01T00:00:00Z' }, NOW)
    expect(decade.from).toEqual(new Date(NOW.getTime() - 30 * DAY_MS))
  })
})

describe('revenue is grouped by currency and never summed across them', () => {
  it('keeps two currencies apart, largest first', () => {
    // `Service.currency` is free-form text, so one combined total would be a wrong
    // answer rather than an approximate one.
    const result = build([
      row({ price: 20.00, currency: 'USD' }),
      row({ price: 30.00, currency: 'USD' }),
      row({ price: 100.00, currency: 'EUR' }),
    ])

    expect(result.totals.revenue).toEqual([
      { currency: 'EUR', total: 100 },
      { currency: 'USD', total: 50 },
    ])
  })

  it('counts only completed bookings as revenue', () => {
    const result = build([
      row({ status: 'completed' }),
      row({ status: 'scheduled' }),
      row({ status: 'cancelled' }),
      row({ status: 'no_show' }),
    ])
    expect(result.totals.revenue).toEqual([{ currency: 'USD', total: 20 }])
  })

  it('groups a priced service with no currency under a placeholder rather than dropping it', () => {
    const result = build([row({ currency: null })])
    expect(result.totals.revenue).toEqual([{ currency: '—', total: 20 }])
  })

  it('sums in minor units, so decimals do not drift', () => {
    const result = build([
      row({ price: 0.10 }),
      row({ price: 0.20 }),
    ])
    expect(result.totals.revenue[0]?.total).toBe(0.3)
  })

  it('ignores a booking with no price at all', () => {
    expect(build([row({ price: null })]).totals.revenue).toEqual([])
  })
})

describe('rates are taken over settled bookings only', () => {
  it('excludes bookings that have not happened yet', () => {
    // Dividing by every booking would make the completion rate fall simply because next
    // week is filling up, which reads as a problem where there is none.
    const result = build([
      row({ status: 'completed' }),
      row({ status: 'cancelled' }),
      row({ status: 'scheduled' }),
      row({ status: 'confirmed' }),
    ])
    expect(result.rates.completion).toBe(0.5)
    expect(result.rates.cancellation).toBe(0.5)
  })

  it('is null, not zero, before anything settles', () => {
    const result = build([row({ status: 'scheduled' })])
    expect(result.rates).toEqual({ completion: null, cancellation: null, noShow: null })
  })
})

describe('series', () => {
  it('zero-fills every day in the range, so a chart has no gap to interpolate', () => {
    const result = build([row({ startAt: new Date('2026-09-10T09:00:00Z') })])
    // 30 days plus both endpoints' own keys.
    expect(result.series.length).toBeGreaterThanOrEqual(31)
    expect(result.series.find((point) => point.day === '2026-09-10')).toEqual({
      day: '2026-09-10',
      bookings: 1,
      completed: 1,
    })
    expect(result.series.find((point) => point.day === '2026-09-11')?.bookings).toBe(0)
  })

  it('returns days in chronological order with no duplicates', () => {
    const { series } = build([])
    const days = series.map((point) => point.day)
    expect(days).toEqual([...days].sort())
    expect(new Set(days).size).toBe(days.length)
  })

  it('crosses a DST transition without dropping or repeating a day', () => {
    // Europe/London falls back on 25 October 2026. Sampling every 24h from a local
    // midnight anchor drifts an hour per transition and can skip a local day outright.
    const range = parseAnalyticsRange(
      { from: '2026-10-20T00:00:00Z', to: '2026-10-30T00:00:00Z' },
      new Date('2026-10-30T00:00:00Z')
    )
    const { series } = buildProviderAnalytics([], [], range, 'Europe/London')
    const days = series.map((point) => point.day)

    expect(new Set(days).size).toBe(days.length)
    for (const day of ['2026-10-24', '2026-10-25', '2026-10-26']) {
      expect(days, day).toContain(day)
    }
  })
})

describe('weekday and hour buckets', () => {
  it('is Monday-first, matching every other weekday list in the app', () => {
    // 2026-09-14 is a Monday.
    const result = build([row({ startAt: new Date('2026-09-14T09:00:00Z'), status: 'confirmed' })])
    expect(result.byWeekday[0]).toEqual({ weekday: 0, bookings: 1 })
    expect(result.byWeekday).toHaveLength(7)
  })

  it('counts only bookings that stood — a cancelled 6am slot is not evidence of demand', () => {
    const result = build([
      row({ startAt: new Date('2026-09-14T06:00:00Z'), status: 'cancelled' }),
      row({ startAt: new Date('2026-09-14T06:00:00Z'), status: 'confirmed' }),
    ])
    expect(result.byHour[6]).toEqual({ hour: 6, bookings: 1 })
  })

  it('buckets the hour in the caller’s zone', () => {
    const result = build([row({ startAt: new Date('2026-09-14T06:00:00Z'), status: 'confirmed' })], [], 'Asia/Yerevan')
    expect(result.byHour[10]?.bookings).toBe(1)
    expect(result.byHour[6]?.bookings).toBe(0)
  })
})

describe('clients and lead time', () => {
  it('counts a returning client once, and only when they booked more than once', () => {
    const result = build([
      row({ consumerId: 'a' }),
      row({ consumerId: 'a' }),
      row({ consumerId: 'b' }),
    ])
    expect(result.clients).toEqual({ total: 2, returning: 1 })
  })

  it('identifies a guest by email when there is no Consumer row', () => {
    const result = build([
      row({ consumerId: null, guestEmail: 'Sam@Example.com' }),
      row({ consumerId: null, guestEmail: 'sam@example.com' }),
    ])
    expect(result.clients).toEqual({ total: 1, returning: 1 })
  })

  it('keeps anonymous guests apart rather than merging them into one client', () => {
    const result = build([
      row({ consumerId: null, guestEmail: null }),
      row({ consumerId: null, guestEmail: null }),
    ])
    expect(result.clients).toEqual({ total: 2, returning: 0 })
  })

  it('takes the median lead time and ignores bookings logged after the fact', () => {
    const result = build([
      row({ createdAt: new Date('2026-09-10T07:00:00Z'), startAt: new Date('2026-09-10T09:00:00Z') }),
      row({ createdAt: new Date('2026-09-10T05:00:00Z'), startAt: new Date('2026-09-10T09:00:00Z') }),
      // Negative: says nothing about how far ahead people book.
      row({ createdAt: new Date('2026-09-10T12:00:00Z'), startAt: new Date('2026-09-10T09:00:00Z') }),
    ])
    expect(result.medianLeadTimeHours).toBe(3)
  })

  it('is null when there is nothing to take a median of', () => {
    expect(build([]).medianLeadTimeHours).toBeNull()
  })
})

describe('previous period', () => {
  it('is computed with the same code, so a delta compares like with like', () => {
    const result = build([row(), row()], [row()])
    expect(result.totals.bookings).toBe(2)
    expect(result.previous.bookings).toBe(1)
    expect(result.previous.revenue).toEqual([{ currency: 'USD', total: 20 }])
  })
})

describe('topServices', () => {
  it('orders by booking count, with its own revenue split by currency', () => {
    const result = build([
      row({ serviceId: 'cut' }),
      row({ serviceId: 'cut' }),
      row({ serviceId: 'colour', price: 80.00 }),
    ])
    expect(result.topServices.map((service) => service.serviceId)).toEqual(['cut', 'colour'])
    expect(result.topServices[0]?.revenue).toEqual([{ currency: 'USD', total: 40 }])
  })
})

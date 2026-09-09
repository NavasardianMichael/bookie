import { describe, expect, it } from 'vitest'
import {
  asTimeZone,
  countBookingsByDay,
  dayKeyInZone,
  isBookingStatus,
  monthRangeInZone,
  parseProviderBookingsQuery,
  zoneOffsetMs,
} from '../../../server/src/services/providerBookings'

/**
 * The provider bookings tab's query contract. The route is a thin delegate, so this is
 * where the narrowing, the page window and the timezone arithmetic actually live.
 */

const PROVIDER = 'provider-1'

describe('parseProviderBookingsQuery — scoping', () => {
  it('always scopes to the caller, whatever the query string says', () => {
    // The provider id is never a parameter; it comes off the session. A query trying to
    // set one has to be ignored rather than merged.
    const { where } = parseProviderBookingsQuery(PROVIDER, { providerId: 'someone-else' })
    expect(where.providerId).toBe(PROVIDER)
  })

  it('narrows to exactly the provider when nothing else is asked for', () => {
    expect(parseProviderBookingsQuery(PROVIDER, {}).where).toEqual({ providerId: PROVIDER })
  })
})

describe('parseProviderBookingsQuery — filters degrade rather than throw', () => {
  it('drops an unparseable date bound instead of erroring', () => {
    // A bad `?from=` should show the unfiltered list, not a 400 on a screen the provider
    // never asked a question of.
    expect(parseProviderBookingsQuery(PROVIDER, { from: 'not-a-date' }).where.startAt).toBeUndefined()
  })

  it('accepts either bound on its own', () => {
    const only = parseProviderBookingsQuery(PROVIDER, { from: '2026-09-01' }).where.startAt
    expect(only).toEqual({ gte: new Date('2026-09-01') })
  })

  it('keeps only statuses that exist in the enum', () => {
    const { where } = parseProviderBookingsQuery(PROVIDER, { status: ['completed', 'drop table', 'no_show'] })
    expect(where.status).toEqual({ in: ['completed', 'no_show'] })
  })

  it('treats a single status string the way Express delivers it', () => {
    expect(parseProviderBookingsQuery(PROVIDER, { status: 'cancelled' }).where.status).toEqual({
      in: ['cancelled'],
    })
  })

  it('omits the status filter entirely when nothing survives, rather than matching nothing', () => {
    expect(parseProviderBookingsQuery(PROVIDER, { status: ['bogus'] }).where.status).toBeUndefined()
  })

  it('dedupes repeated statuses', () => {
    expect(parseProviderBookingsQuery(PROVIDER, { status: ['completed', 'completed'] }).where.status).toEqual({
      in: ['completed'],
    })
  })

  it('narrows a multi-word search with AND, so two words find fewer rows and not more', () => {
    const { where } = parseProviderBookingsQuery(PROVIDER, { q: 'sarah connor' })
    expect(where.AND).toHaveLength(2)
  })

  it('caps the search term fan-out', () => {
    const { where } = parseProviderBookingsQuery(PROVIDER, { q: 'a b c d e f g h' })
    expect(where.AND).toHaveLength(5)
  })
})

describe('parseProviderBookingsQuery — sort and page', () => {
  it('defaults to newest first, because this is a history view', () => {
    expect(parseProviderBookingsQuery(PROVIDER, {}).orderBy).toEqual([{ startAt: 'desc' }])
  })

  it('falls back to the default for an unknown sort rather than reaching Prisma', () => {
    expect(parseProviderBookingsQuery(PROVIDER, { sort: 'startAt; DROP' }).orderBy).toEqual([{ startAt: 'desc' }])
  })

  it('orders guest bookings last when sorting by name, since they have no Consumer row', () => {
    const { orderBy } = parseProviderBookingsQuery(PROVIDER, { sort: 'nameAsc' })
    expect(orderBy).toEqual([{ consumer: { lastName: 'asc' } }, { guestLastName: { sort: 'asc', nulls: 'last' } }])
  })

  it('clamps a hostile page size and rejects a non-positive page', () => {
    expect(parseProviderBookingsQuery(PROVIDER, { perPage: '100000' }).perPage).toBe(100)
    expect(parseProviderBookingsQuery(PROVIDER, { page: '0' }).page).toBe(1)
    expect(parseProviderBookingsQuery(PROVIDER, { page: '-3' }).page).toBe(1)
  })
})

describe('asTimeZone', () => {
  it('accepts a real IANA zone', () => {
    expect(asTimeZone('Asia/Yerevan')).toBe('Asia/Yerevan')
  })

  it('falls back to UTC rather than letting Intl throw a calendar down', () => {
    expect(asTimeZone('Mars/Olympus')).toBe('UTC')
    expect(asTimeZone('')).toBe('UTC')
    expect(asTimeZone(undefined)).toBe('UTC')
    expect(asTimeZone(42)).toBe('UTC')
  })
})

describe('zoneOffsetMs', () => {
  const HOUR = 60 * 60 * 1000

  it('is positive east of Greenwich', () => {
    expect(zoneOffsetMs(new Date('2026-09-15T12:00:00Z'), 'Asia/Yerevan')).toBe(4 * HOUR)
  })

  it('is negative west of it, and follows DST', () => {
    expect(zoneOffsetMs(new Date('2026-09-15T12:00:00Z'), 'America/New_York')).toBe(-4 * HOUR)
    expect(zoneOffsetMs(new Date('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-5 * HOUR)
  })

  it('is zero for UTC', () => {
    expect(zoneOffsetMs(new Date('2026-09-15T12:00:00Z'), 'UTC')).toBe(0)
  })
})

describe('monthRangeInZone', () => {
  it('bounds the month in the caller’s zone, not in UTC', () => {
    // Local midnight on 1 September in Yerevan (+4) is 20:00 on 31 August UTC. Bounding
    // in UTC would drop every booking in those four hours from the grid that shows them.
    const range = monthRangeInZone('2026-09', 'Asia/Yerevan')
    expect(range?.start.toISOString()).toBe('2026-08-31T20:00:00.000Z')
    expect(range?.end.toISOString()).toBe('2026-09-30T20:00:00.000Z')
  })

  it('matches the calendar exactly for UTC', () => {
    const range = monthRangeInZone('2026-09', 'UTC')
    expect(range?.start.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(range?.end.toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('rolls the year over in December', () => {
    const range = monthRangeInZone('2026-12', 'UTC')
    expect(range?.end.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })

  it('is half-open, so the last millisecond of the month cannot fall through', () => {
    const range = monthRangeInZone('2026-09', 'UTC')!
    const lastInstant = new Date('2026-09-30T23:59:59.999Z')
    expect(lastInstant >= range.start && lastInstant < range.end).toBe(true)
  })

  it('rejects anything that is not YYYY-MM', () => {
    expect(monthRangeInZone('2026-13', 'UTC')).toBeNull()
    expect(monthRangeInZone('2026', 'UTC')).toBeNull()
    expect(monthRangeInZone('nonsense', 'UTC')).toBeNull()
  })
})

describe('dayKeyInZone', () => {
  it('gives the day the provider saw, not the UTC one', () => {
    // 22:00 UTC on the 14th is 02:00 on the 15th in Yerevan.
    const instant = new Date('2026-09-14T22:00:00Z')
    expect(dayKeyInZone(instant, 'UTC')).toBe('2026-09-14')
    expect(dayKeyInZone(instant, 'Asia/Yerevan')).toBe('2026-09-15')
  })
})

describe('countBookingsByDay', () => {
  const rows = [
    { startAt: new Date('2026-09-14T09:00:00Z'), status: 'completed' },
    { startAt: new Date('2026-09-14T11:00:00Z'), status: 'cancelled' },
    { startAt: new Date('2026-09-14T13:00:00Z'), status: 'no_show' },
    { startAt: new Date('2026-09-15T09:00:00Z'), status: 'scheduled' },
  ]

  it('counts every booking in `total` and only the ones that stood in `live`', () => {
    // A day that filled up and then emptied is information; hiding the cancellations
    // would make the grid disagree with the unfiltered list underneath it.
    expect(countBookingsByDay(rows, 'UTC')).toEqual({
      '2026-09-14': { total: 3, live: 1 },
      '2026-09-15': { total: 1, live: 1 },
    })
  })

  it('buckets by the caller’s zone', () => {
    expect(countBookingsByDay([{ startAt: new Date('2026-09-14T22:00:00Z'), status: 'confirmed' }], 'Asia/Yerevan'))
      .toEqual({ '2026-09-15': { total: 1, live: 1 } })
  })
})

describe('isBookingStatus', () => {
  it('accepts the enum and nothing else', () => {
    expect(isBookingStatus('no_show')).toBe(true)
    // The interface used to declare `'no-show'`; the Prisma enum is `no_show`.
    expect(isBookingStatus('no-show')).toBe(false)
    expect(isBookingStatus(undefined)).toBe(false)
  })
})

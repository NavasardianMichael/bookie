import { describe, expect, it } from 'vitest'
import { SUPPORTED_TIME_ZONES } from '../../../server/src/lib/time-zone'
import {
  isOpenToday,
  parseProvidersListQuery,
  PUBLIC_PROVIDER_WHERE,
  resolvePageWindow,
} from '../../../server/src/services/providerSearch'

/**
 * Public directories must never surface an unpublished page. The route is a
 * five-line handler; this is where `listed` actually lives.
 */
describe('parseProvidersListQuery', () => {
  it('always requires a published page', () => {
    expect(parseProvidersListQuery({}).where).toEqual(PUBLIC_PROVIDER_WHERE)
    expect(PUBLIC_PROVIDER_WHERE).toEqual({ listed: true })
  })

  it('adds available only when the flag is on', () => {
    expect(parseProvidersListQuery({ available: 'true' }).where).toMatchObject({
      listed: true,
      available: true,
    })
    expect(parseProvidersListQuery({ available: '1' }).where.available).toBe(true)
    expect(parseProvidersListQuery({ available: 'yes' }).where.available).toBeUndefined()
  })

  it('openToday reads hours for the weekday of `now`, not the pause flag', () => {
    const mondayNoonUtc = new Date('2026-09-07T12:00:00.000Z')
    const sundayNoonUtc = new Date('2026-09-06T12:00:00.000Z')
    const zonelessBranch = (now: Date) => (parseProvidersListQuery({ openToday: true }, now).where.OR as unknown[])[0]

    // A provider who never set a zone keeps the server's weekday (TZ is pinned to UTC here).
    expect(zonelessBranch(mondayNoonUtc)).toEqual({
      timeZone: null,
      weekSchedule: { path: ['monday', 'availability', 'start'], string_contains: ':' },
    })
    expect(zonelessBranch(sundayNoonUtc)).toMatchObject({ weekSchedule: { path: ['sunday', 'availability', 'start'] } })
    expect(parseProvidersListQuery({ openToday: true }, mondayNoonUtc).where.available).toBeUndefined()
    expect(parseProvidersListQuery({}, mondayNoonUtc).where.OR).toBeUndefined()
  })

  /**
   * "Today" is the provider's. At 22:00 UTC on a Monday it is already Tuesday in Yerevan and
   * still Monday in New York, so each zone has to be matched against its own weekday — and
   * every zone a provider can store has to land in exactly one branch.
   */
  it("openToday matches each provider against the weekday in their own zone", () => {
    const lateMondayUtc = new Date('2026-09-07T22:00:00.000Z')
    const branches = parseProvidersListQuery({ openToday: true }, lateMondayUtc).where.OR as Array<{
      timeZone: { in: string[] } | null
      weekSchedule: { path: string[] }
    }>
    const weekdayFor = (zone: string) =>
      branches.find((branch) => branch.timeZone?.in.includes(zone))?.weekSchedule.path[0]

    expect(weekdayFor('Asia/Yerevan')).toBe('tuesday')
    expect(weekdayFor('America/New_York')).toBe('monday')
    expect(weekdayFor('UTC')).toBe('monday')

    const zoned = branches.flatMap((branch) => branch.timeZone?.in ?? [])
    expect(zoned).toHaveLength(SUPPORTED_TIME_ZONES.length)
    expect(new Set(zoned).size).toBe(SUPPORTED_TIME_ZONES.length)
  })

  it('isOpenToday matches the filter: HH:mm start on that weekday, empty otherwise', () => {
    const mondayNoonUtc = new Date('2026-09-07T12:00:00.000Z')
    const sundayNoonUtc = new Date('2026-09-06T12:00:00.000Z')
    const weekSchedule = {
      monday: { availability: { start: '09:00', end: '17:00' }, breaks: [] },
      sunday: { availability: { start: '', end: '' }, breaks: [] },
    }

    expect(isOpenToday(weekSchedule, mondayNoonUtc)).toBe(true)
    expect(isOpenToday(weekSchedule, sundayNoonUtc)).toBe(false)
    expect(isOpenToday({}, mondayNoonUtc)).toBe(false)
    expect(isOpenToday(null, mondayNoonUtc)).toBe(false)
  })

  it("isOpenToday reads the weekday in the provider's zone", () => {
    const lateMondayUtc = new Date('2026-09-07T22:00:00.000Z')
    const mondaysOnly = { monday: { availability: { start: '09:00', end: '17:00' }, breaks: [] } }

    expect(isOpenToday(mondaysOnly, lateMondayUtc, 'America/New_York')).toBe(true)
    expect(isOpenToday(mondaysOnly, lateMondayUtc, 'Asia/Yerevan')).toBe(false)
    // An unset or unreadable zone is the server's weekday, as before the column existed.
    expect(isOpenToday(mondaysOnly, lateMondayUtc, null)).toBe(true)
    expect(isOpenToday(mondaysOnly, lateMondayUtc, 'Mars/Olympus')).toBe(true)
  })

  it('restricts a service-name search to active services', () => {
    const where = parseProvidersListQuery({ q: 'cut' }).where
    const and = where.AND as Array<{ OR: Array<{ services?: { some: Record<string, unknown> } }> }>

    expect(and[0]?.OR).toEqual(
      expect.arrayContaining([
        { services: { some: { name: { contains: 'cut', mode: 'insensitive' }, active: true } } },
      ])
    )
  })

  it('narrows an unknown sort to recommended', () => {
    expect(parseProvidersListQuery({ sort: 'DROP TABLE' }).orderBy).toEqual(parseProvidersListQuery({}).orderBy)
  })

  /**
   * `recommended` reads the denormalised `ratingScore` rather than aggregating `Review`.
   * That column is the whole reason a rating ordering is allowed here at all — see the
   * comment on `ORDER_BY`, which used to forbid exactly this.
   */
  it('ranks recommended by availability, then rating, then freshness', () => {
    expect(parseProvidersListQuery({}).orderBy).toEqual([
      { available: 'desc' },
      { ratingScore: 'desc' },
      { updatedAt: 'desc' },
    ])
  })

  // `ratingCount` breaks the tie so that, between two providers the prior has pinned to
  // the same score, the one with evidence behind it comes first.
  it('offers a top-rated sort that breaks ties on review count', () => {
    expect(parseProvidersListQuery({ sort: 'topRated' }).orderBy).toEqual([
      { ratingScore: 'desc' },
      { ratingCount: 'desc' },
    ])
  })
})

describe('resolvePageWindow', () => {
  it('clamps an out-of-range page onto the last real one', () => {
    expect(resolvePageWindow(25, 99, 9)).toEqual({ page: 3, pageCount: 3, skip: 18 })
  })

  it('keeps an empty result set on page 1 rather than skip-past-end', () => {
    expect(resolvePageWindow(0, 4, 9)).toEqual({ page: 1, pageCount: 1, skip: 0 })
  })
})

import { describe, expect, it } from 'vitest'
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

    expect(parseProvidersListQuery({ openToday: true }, mondayNoonUtc).where).toMatchObject({
      listed: true,
      weekSchedule: { path: ['monday', 'availability', 'start'], string_contains: ':' },
    })
    expect(parseProvidersListQuery({ openToday: true }, sundayNoonUtc).where.weekSchedule).toMatchObject({
      path: ['sunday', 'availability', 'start'],
    })
    expect(parseProvidersListQuery({ openToday: true }, mondayNoonUtc).where.available).toBeUndefined()
    expect(parseProvidersListQuery({}, mondayNoonUtc).where.weekSchedule).toBeUndefined()
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

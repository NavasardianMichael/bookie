import { describe, expect, it } from 'vitest'
import {
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

  it('narrows an unknown sort to recommended', () => {
    expect(parseProvidersListQuery({ sort: 'DROP TABLE' }).orderBy).toEqual(
      parseProvidersListQuery({}).orderBy
    )
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

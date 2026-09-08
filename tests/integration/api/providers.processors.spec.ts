import { describe, expect, it } from 'vitest'
import {
  processProviderProfileResponse,
  processProvidersListResponse,
  processSingleProviderResponse,
} from '@api/providers/processors'
import { ProvidersListPagination } from '@store/providers/list/types'
import { ProviderService } from '@store/providers/profile/types'
import { APIResponse } from '@interfaces/api'

/** The server envelope every processor takes. */
const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const basicProvider = (id: string) => ({
  id,
  basic: { firstName: 'Ada', lastName: 'Lovelace', available: true },
})

const service = (id: string): ProviderService =>
  ({ id, name: `Service ${id}`, duration: 30, price: 10, currency: 'usd' }) as ProviderService

/** The paged envelope `GET /providers` answers with. */
const pagedProviders = (items: ReturnType<typeof basicProvider>[], window: Partial<ProvidersListPagination> = {}) => ({
  items,
  total: items.length,
  page: 1,
  perPage: 9,
  pageCount: 1,
  ...window,
})

describe('processProvidersListResponse', () => {
  it('normalizes the page into byId + allIds, preserving order', () => {
    const providers = [basicProvider('a'), basicProvider('b')]

    expect(processProvidersListResponse(envelope(pagedProviders(providers)) as never).list).toEqual({
      allIds: ['a', 'b'],
      byId: { a: providers[0], b: providers[1] },
    })
  })

  it('returns empty structures for an empty page', () => {
    expect(processProvidersListResponse(envelope(pagedProviders([])) as never).list).toEqual({
      allIds: [],
      byId: {},
    })
  })

  // The API clamps an out-of-range page, so the pager has to render the window that
  // came back rather than the one that was asked for.
  it('passes the served window through verbatim', () => {
    const response = pagedProviders([basicProvider('a')], { total: 31, page: 4, perPage: 9, pageCount: 4 })

    expect(processProvidersListResponse(envelope(response) as never).pagination).toEqual({
      total: 31,
      page: 4,
      perPage: 9,
      pageCount: 4,
    })
  })
})

// normalizeServicesPayload has four branches. The server (mapSingleProvider in
// server/src/mappers/entities.ts) already reduces services to { allIds, byId } before
// sending, so the normalized shape is what arrives today — but all four must hold.
describe('processSingleProviderResponse', () => {
  // Regression: an array has neither `.allIds` nor `.byId`, so before the Array.isArray
  // branch existed this fell through to Object.values({}) and dropped every service.
  it('normalizes services delivered as a plain array', () => {
    const provider = { ...basicProvider('p1'), details: {}, services: [service('s1'), service('s2')] }

    const result = processSingleProviderResponse(envelope(provider) as never)

    expect(result.services.allIds).toEqual(['s1', 's2'])
    expect(result.services.byId.s1.name).toBe('Service s1')
  })

  it('yields empty structures for an empty services array', () => {
    const provider = { ...basicProvider('p1'), details: {}, services: [] }

    expect(processSingleProviderResponse(envelope(provider) as never).services).toEqual({ allIds: [], byId: {} })
  })

  it('passes through services that are already normalized', () => {
    const normalized = { allIds: ['s1'], byId: { s1: service('s1') } }
    const provider = { ...basicProvider('p1'), details: {}, services: normalized }

    expect(processSingleProviderResponse(envelope(provider) as never).services).toEqual(normalized)
  })

  it('rebuilds allIds when only byId was sent', () => {
    const provider = {
      ...basicProvider('p1'),
      details: {},
      services: { allIds: [], byId: { s1: service('s1'), s2: service('s2') } },
    }

    expect(processSingleProviderResponse(envelope(provider) as never).services.allIds).toEqual(['s1', 's2'])
  })

  it('yields empty structures when services are missing entirely', () => {
    const provider = { ...basicProvider('p1'), details: {} }

    expect(processSingleProviderResponse(envelope(provider) as never).services).toEqual({ allIds: [], byId: {} })
  })

  it('leaves every other field untouched', () => {
    const provider = { ...basicProvider('p1'), details: { email: 'a@b.test' }, services: [] }

    const result = processSingleProviderResponse(envelope(provider) as never)

    expect(result.id).toBe('p1')
    expect(result.basic.firstName).toBe('Ada')
    expect(result.details).toEqual({ email: 'a@b.test' })
  })
})

describe('processProviderProfileResponse', () => {
  it.each([
    ['byId-only', { allIds: [], byId: { s1: service('s1') } }],
    ['a plain array', [service('s1')]],
    ['already normalized', { allIds: ['s1'], byId: { s1: service('s1') } }],
  ])('normalizes services delivered as %s, like the single-provider processor', (_shape, services) => {
    const profile = { ...basicProvider('p1'), details: {}, personal: {}, services }

    expect(processProviderProfileResponse(envelope(profile) as never).services.allIds).toEqual(['s1'])
  })

  it('keeps the personal slice the profile adds over the single-provider shape', () => {
    const profile = { ...basicProvider('p1'), details: {}, personal: { plan: 'free' }, services: undefined }

    expect(processProviderProfileResponse(envelope(profile) as never).personal).toEqual({ plan: 'free' })
  })
})

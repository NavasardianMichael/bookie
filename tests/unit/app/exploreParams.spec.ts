import {
  buildExploreHref,
  buildExploreQuery,
  countActiveFilters,
  ExploreParams,
  exploreParamsKey,
  hasActiveExploreParams,
  parseExploreParams,
  PROVIDERS_PER_PAGE,
  toProvidersListQuery,
} from '@app/[lang]/providers/exploreParams'
import { describe, expect, it } from 'vitest'

const DEFAULTS: ExploreParams = {
  q: '',
  categoryId: '',
  available: false,
  openToday: false,
  sort: 'recommended',
  page: 1,
}

describe('parseExploreParams', () => {
  it('reads a full query string', () => {
    expect(
      parseExploreParams({
        q: ' hair ',
        category: 'cat-1',
        available: 'true',
        openToday: 'true',
        sort: 'nameAsc',
        page: '3',
      })
    ).toEqual({ q: 'hair', categoryId: 'cat-1', available: true, openToday: true, sort: 'nameAsc', page: 3 })
  })

  it('falls back to defaults for an empty query', () => {
    expect(parseExploreParams({})).toEqual(DEFAULTS)
  })

  // A hand-edited or stale URL must degrade, not 500 — everything reaching Prisma is
  // narrowed to a closed set here and again on the server.
  it.each([
    ['an unknown sort', { sort: 'DROP TABLE' }, 'sort', 'recommended'],
    ['a zero page', { page: '0' }, 'page', 1],
    ['a negative page', { page: '-4' }, 'page', 1],
    ['a non-numeric page', { page: 'two' }, 'page', 1],
    ['a float page', { page: '2.7' }, 'page', 2],
  ])('narrows %s', (_case, raw, key, expected) => {
    expect(parseExploreParams(raw)[key as keyof ExploreParams]).toBe(expected)
  })

  // `?available=1` is not what the builder emits, so it is not what the parser accepts —
  // one spelling, or the toggle reads as on when the URL says something else.
  it('treats any value other than "true" as off', () => {
    expect(parseExploreParams({ available: '1', openToday: 'yes' })).toMatchObject({
      available: false,
      openToday: false,
    })
  })

  it('takes the first value of a repeated key', () => {
    expect(parseExploreParams({ q: ['first', 'second'] }).q).toBe('first')
  })
})

describe('buildExploreQuery', () => {
  it('omits every default, so the unfiltered first page is the bare path', () => {
    expect(buildExploreQuery(DEFAULTS)).toBe('')
    expect(buildExploreHref(DEFAULTS)).toBe('/providers')
  })

  it('emits only what differs from the default', () => {
    expect(buildExploreQuery(DEFAULTS, { q: 'hair', page: 2 })).toBe('?q=hair&page=2')
  })

  it('round-trips through the parser', () => {
    const params: ExploreParams = {
      q: 'deep tissue',
      categoryId: 'cat-9',
      available: true,
      openToday: true,
      sort: 'newest',
      page: 5,
    }
    const query = buildExploreQuery(params)
    const raw = Object.fromEntries(new URLSearchParams(query.slice(1)))

    expect(parseExploreParams(raw)).toEqual(params)
  })

  // Being on page 4 and then searching must not land on an empty grid.
  it.each([
    ['a search', { q: 'hair' }],
    ['a category', { categoryId: 'cat-1' }],
    ['a sort', { sort: 'nameAsc' as const }],
    ['a filter', { available: true }],
    ['open today', { openToday: true }],
  ])('resets to page 1 when %s changes', (_case, patch) => {
    expect(buildExploreQuery({ ...DEFAULTS, page: 4 }, patch)).not.toContain('page=')
  })

  it('keeps the requested page when the page itself is the patch', () => {
    expect(buildExploreQuery({ ...DEFAULTS, q: 'hair', page: 4 }, { page: 2 })).toBe('?q=hair&page=2')
  })

  it('locale-free, so AppLink and useRouter can add the prefix', () => {
    expect(buildExploreHref(DEFAULTS, { categoryId: 'cat-1' })).toBe('/providers?category=cat-1')
  })
})

describe('toProvidersListQuery', () => {
  it('drops blank values rather than sending them as empty strings', () => {
    expect(toProvidersListQuery(DEFAULTS)).toEqual({
      q: undefined,
      categoryId: undefined,
      available: undefined,
      openToday: undefined,
      sort: 'recommended',
      page: 1,
      perPage: PROVIDERS_PER_PAGE,
    })
  })

  it('forwards what was set', () => {
    expect(
      toProvidersListQuery({ ...DEFAULTS, q: 'hair', categoryId: 'cat-1', available: true, openToday: true })
    ).toMatchObject({
      q: 'hair',
      categoryId: 'cat-1',
      available: true,
      openToday: true,
    })
  })
})

describe('activity helpers', () => {
  it('counts only the sheet toggles', () => {
    expect(countActiveFilters(DEFAULTS)).toBe(0)
    expect(countActiveFilters({ ...DEFAULTS, available: true })).toBe(1)
    expect(countActiveFilters({ ...DEFAULTS, available: true, openToday: true })).toBe(2)
    // A search or a sort is not a "filter" for the badge's purposes.
    expect(countActiveFilters({ ...DEFAULTS, q: 'hair', sort: 'newest' })).toBe(0)
  })

  // Decides which empty state renders: "no matches, clear a filter" vs "no providers yet".
  it.each([
    ['nothing set', DEFAULTS, false],
    ['a search', { ...DEFAULTS, q: 'hair' }, true],
    ['a category', { ...DEFAULTS, categoryId: 'cat-1' }, true],
    ['a filter', { ...DEFAULTS, available: true }, true],
    ['open today', { ...DEFAULTS, openToday: true }, true],
    ['only a sort', { ...DEFAULTS, sort: 'newest' as const }, false],
  ])('hasActiveExploreParams is %s -> %s', (_case, params, expected) => {
    expect(hasActiveExploreParams(params)).toBe(expected)
  })
})

describe('exploreParamsKey', () => {
  // The <Suspense> key. Two different result sets must not share one, or the grid keeps
  // the previous page's rows instead of handing over to the skeleton.
  it('differs per result set and is stable for the default', () => {
    expect(exploreParamsKey(DEFAULTS)).toBe('default')
    expect(exploreParamsKey({ ...DEFAULTS, page: 2 })).not.toBe(exploreParamsKey(DEFAULTS))
    expect(exploreParamsKey({ ...DEFAULTS, q: 'a' })).not.toBe(exploreParamsKey({ ...DEFAULTS, q: 'b' }))
  })
})

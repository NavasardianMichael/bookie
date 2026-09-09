import { ProvidersListQuery, ProvidersListSort } from '@api/providers/types'
import { ROUTES } from '@constants/routes'
import { paramsToQueryString } from '@helpers/api'

/**
 * Explore's state lives in the URL, and this module is the only thing that knows its
 * shape.
 *
 * Why the URL rather than a store: the grid is a Server Component, so search, filter,
 * sort and page have to survive a server round-trip anyway. Keeping them in the query
 * string means one source of truth instead of two, a shareable and back-buttonable
 * result set, and no provider rows duplicated into client state. `useProvidersListStore`
 * stays available for genuinely client-side lists; this page does not use it.
 *
 * Both directions live here so the server page and the two client islands cannot drift:
 * the page parses, the islands patch.
 */

export const EXPLORE_PARAMS = {
  q: 'q',
  category: 'category',
  available: 'available',
  openToday: 'openToday',
  sort: 'sort',
  page: 'page',
} as const

/** Matches `PROVIDERS_PAGE_SIZE` in `server/src/services/providerSearch.ts`. */
export const PROVIDERS_PER_PAGE = 9

export const EXPLORE_SORTS: ProvidersListSort[] = ['recommended', 'nameAsc', 'nameDesc', 'newest']

export const DEFAULT_EXPLORE_SORT: ProvidersListSort = 'recommended'

/** What `page.tsx` receives — Next hands over repeated keys as an array. */
export type RawSearchParams = Record<string, string | string[] | undefined>

export type ExploreParams = {
  q: string
  categoryId: string
  available: boolean
  openToday: boolean
  sort: ProvidersListSort
  page: number
}

/** A repeated key (`?q=a&q=b`) is a malformed URL, not two searches — take the first. */
const first = (raw: string | string[] | undefined): string => (Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? ''))

const toPage = (raw: string | string[] | undefined): number => {
  const parsed = Number.parseInt(first(raw), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

/**
 * Every value is narrowed to something the API accepts, so a hand-edited query string
 * degrades to the default rather than rendering an error.
 */
export const parseExploreParams = (raw: RawSearchParams): ExploreParams => {
  const sort = first(raw[EXPLORE_PARAMS.sort]) as ProvidersListSort

  return {
    q: first(raw[EXPLORE_PARAMS.q]).trim(),
    categoryId: first(raw[EXPLORE_PARAMS.category]),
    available: first(raw[EXPLORE_PARAMS.available]) === 'true',
    openToday: first(raw[EXPLORE_PARAMS.openToday]) === 'true',
    sort: EXPLORE_SORTS.includes(sort) ? sort : DEFAULT_EXPLORE_SORT,
    page: toPage(raw[EXPLORE_PARAMS.page]),
  }
}

/** The keys that change *which* providers match, as opposed to which slice of them. */
const RESULT_SET_KEYS = ['q', 'categoryId', 'available', 'openToday', 'sort'] as const

/**
 * Changing what matches has to send the visitor back to page 1 — being on page 4 of a
 * 12-page list and then searching would otherwise land on an empty grid.
 *
 * Two patches must survive that rule: one naming `page` (the pager itself), and the
 * empty one, which is how a caller asks for the current URL. Resetting there silently
 * rewrote page 4 as page 1 — it broke `exploreParamsKey`, so the `<Suspense>` boundary
 * shared one key across every page and the grid never handed over to its skeleton.
 */
const withPageReset = (patch: Partial<ExploreParams>): Partial<ExploreParams> => {
  if ('page' in patch) return patch
  if (!RESULT_SET_KEYS.some((key) => key in patch)) return patch
  return { ...patch, page: 1 }
}

/**
 * `?q=hair&page=2` — defaults are omitted, so the unfiltered first page is the bare
 * `/providers` URL and one result set has exactly one address.
 */
export const buildExploreQuery = (params: ExploreParams, patch: Partial<ExploreParams> = {}): string => {
  const next = { ...params, ...withPageReset(patch) }

  const queryString = paramsToQueryString({
    [EXPLORE_PARAMS.q]: next.q || undefined,
    [EXPLORE_PARAMS.category]: next.categoryId || undefined,
    [EXPLORE_PARAMS.available]: next.available || undefined,
    [EXPLORE_PARAMS.openToday]: next.openToday || undefined,
    [EXPLORE_PARAMS.sort]: next.sort === DEFAULT_EXPLORE_SORT ? undefined : next.sort,
    [EXPLORE_PARAMS.page]: next.page > 1 ? next.page : undefined,
  })

  return queryString ? `?${queryString}` : ''
}

/** Locale-free, as every `ROUTES` path is — `AppLink` and `useRouter` add the prefix. */
export const buildExploreHref = (params: ExploreParams, patch: Partial<ExploreParams> = {}): string =>
  `${ROUTES.providers}${buildExploreQuery(params, patch)}`

/** The payload for `getProvidersListAPI`. Blank values are dropped, not sent as `''`. */
export const toProvidersListQuery = (params: ExploreParams): ProvidersListQuery => ({
  q: params.q || undefined,
  categoryId: params.categoryId || undefined,
  available: params.available || undefined,
  openToday: params.openToday || undefined,
  sort: params.sort,
  page: params.page,
  perPage: PROVIDERS_PER_PAGE,
})

/**
 * Identity of a result set, for the `<Suspense key>` that swaps the grid for a skeleton
 * while the next one streams in.
 */
export const exploreParamsKey = (params: ExploreParams): string => buildExploreQuery(params) || 'default'

/** Drives the "N active" badge on the filter button, and the Reset control. */
export const countActiveFilters = (params: ExploreParams): number =>
  Number(params.available) + Number(params.openToday)

export const hasActiveExploreParams = (params: ExploreParams): boolean =>
  !!params.q || !!params.categoryId || countActiveFilters(params) > 0


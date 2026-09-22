import { Prisma } from '@prisma/client'

/**
 * The Explore list's query contract: what `GET /providers` accepts, and the Prisma
 * `where` / `orderBy` / window it turns into.
 *
 * It lives here rather than in the route so the parsing is testable and so the route
 * stays a five-line handler. Every accepted value is validated into a closed set —
 * `?sort=drop%20table` resolves to the default rather than reaching Prisma.
 */

export const PROVIDERS_PAGE_SIZE = 9
const PROVIDERS_MAX_PAGE_SIZE = 48

/**
 * A multi-word query narrows: each term must match *somewhere*, so "sarah massage"
 * finds the therapist rather than everyone named Sarah plus everyone offering massage.
 * The cap bounds the OR-per-term fan-out a hostile query string could ask for.
 */
const SEARCH_TERM_LIMIT = 5

export type ProvidersListSort = 'recommended' | 'topRated' | 'nameAsc' | 'nameDesc' | 'newest'

/**
 * `recommended` puts bookable providers first, best-rated next, and freshest-edited last.
 *
 * It used to be a two-term ordering, and this comment used to say a rating sort was off
 * the table because `Review` had no aggregate column, so ordering by it would mean an
 * aggregate over every provider on every page. That is no longer true: `Provider.ratingScore`
 * is a denormalised, indexed column, rewritten on review writes only
 * (`services/reviews.ts#recomputeProviderRating`), so this reads one index instead of
 * aggregating anything.
 *
 * The score is Bayesian rather than a plain average, which is what makes it safe as a
 * *default* ordering: a lone 5★ review scores 4.09, so it cannot outrank a provider with
 * forty reviews at 4.7, and an unrated provider scores exactly the prior and lands
 * mid-pack rather than on the last page forever.
 *
 * `available` stays the first term deliberately. A provider who has paused bookings is
 * not a recommendation however well rated they are — the visitor came here to book.
 */
const ORDER_BY: Record<ProvidersListSort, Prisma.ProviderOrderByWithRelationInput[]> = {
  recommended: [{ available: 'desc' }, { ratingScore: 'desc' }, { updatedAt: 'desc' }],
  // `ratingCount` breaks ties so that, between two providers the prior has pinned to the
  // same score, the one with evidence behind it comes first.
  topRated: [{ ratingScore: 'desc' }, { ratingCount: 'desc' }],
  nameAsc: [{ lastName: 'asc' }, { firstName: 'asc' }],
  nameDesc: [{ lastName: 'desc' }, { firstName: 'desc' }],
  newest: [{ createdAt: 'desc' }],
}

export const PROVIDERS_LIST_SORTS = Object.keys(ORDER_BY) as ProvidersListSort[]

type RawQuery = Record<string, unknown>

const asString = (raw: unknown): string => (typeof raw === 'string' ? raw : '')

const asFlag = (raw: unknown): boolean => raw === true || raw === 'true' || raw === '1'

const asSort = (raw: unknown): ProvidersListSort => PROVIDERS_LIST_SORTS.find((sort) => sort === raw) ?? 'recommended'

const asPositiveInt = (raw: unknown, fallback: number, max: number): number => {
  const parsed = Number.parseInt(asString(raw), 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

const toSearchTerms = (raw: unknown): string[] =>
  asString(raw).trim().split(/\s+/).filter(Boolean).slice(0, SEARCH_TERM_LIMIT)

/**
 * Where one term is allowed to match. `description` is deliberately absent: it is the
 * longest column on the table and the weakest signal, and a service or category name
 * already answers "who does massage?" more precisely.
 */
const matchesTerm = (term: string): Prisma.ProviderWhereInput => ({
  OR: [
    { firstName: { contains: term, mode: 'insensitive' } },
    { lastName: { contains: term, mode: 'insensitive' } },
    { organization: { name: { contains: term, mode: 'insensitive' } } },
    { services: { some: { name: { contains: term, mode: 'insensitive' }, active: true } } },
    { categories: { some: { category: { name: { contains: term, mode: 'insensitive' } } } } },
  ],
})

export type ProvidersListQuery = {
  where: Prisma.ProviderWhereInput
  orderBy: Prisma.ProviderOrderByWithRelationInput[]
  /** 1-based, as requested. Clamped against the real page count by the caller. */
  page: number
  perPage: number
}

/**
 * What a public directory is allowed to show: a published page. Unlisted pages 404
 * for everyone except the owner. Category routes reuse this rather than re-stating it.
 */
export const PUBLIC_PROVIDER_WHERE: Prisma.ProviderWhereInput = {
  listed: true,
}

/**
 * Sunday-first, matching `Date#getDay` and `server/src/services/appointments.ts`.
 * The client's `getWeekDay` is Monday-first and indexes differently; both resolve
 * to the same weekday *name* that `weekSchedule` is keyed on.
 */
const WEEKDAYS_SUNDAY_FIRST = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export const weekdayOf = (now: Date): (typeof WEEKDAYS_SUNDAY_FIRST)[number] => WEEKDAYS_SUNDAY_FIRST[now.getDay()]!

/**
 * Same predicate as `openTodayWhere`: today's weekday has an `'HH:mm'` start.
 * Used by `mapBasicProvider` so the card's Closed state matches the filter.
 */
export function isOpenToday(weekSchedule: unknown, now: Date = new Date()): boolean {
  if (!weekSchedule || typeof weekSchedule !== 'object' || Array.isArray(weekSchedule)) return false
  const day = (weekSchedule as Record<string, { availability?: { start?: unknown } }>)[weekdayOf(now)]
  const start = day?.availability?.start
  return typeof start === 'string' && start.includes(':')
}

/**
 * Today's hours live on `weekSchedule.<day>.availability.start` as `'HH:mm'`.
 * `string_contains: ':'` is a positive check so `''` and a missing key (new
 * accounts store `weekSchedule: {}`) do not match. This is not remaining-slot
 * math — that cannot stay in `count`/`findMany` without breaking pagination.
 */
const openTodayWhere = (now: Date): Prisma.ProviderWhereInput => ({
  weekSchedule: {
    path: [weekdayOf(now), 'availability', 'start'],
    string_contains: ':',
  },
})

export function parseProvidersListQuery(query: RawQuery, now: Date = new Date()): ProvidersListQuery {
  const terms = toSearchTerms(query.q)
  const categoryId = asString(query.categoryId)

  return {
    where: {
      ...PUBLIC_PROVIDER_WHERE,
      // Terms live under `AND` so they cannot collide with the `categories` /
      // `services` keys a search term owns.
      ...(terms.length ? { AND: terms.map(matchesTerm) } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      ...(asFlag(query.available) ? { available: true } : {}),
      ...(asFlag(query.openToday) ? openTodayWhere(now) : {}),
    },
    orderBy: ORDER_BY[asSort(query.sort)],
    page: asPositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER),
    perPage: asPositiveInt(query.perPage, PROVIDERS_PAGE_SIZE, PROVIDERS_MAX_PAGE_SIZE),
  }
}

/**
 * Clamps the requested page into range so deleting rows, or a hand-edited `?page=999`,
 * shows the last page instead of an empty grid.
 */
export function resolvePageWindow(
  total: number,
  requestedPage: number,
  perPage: number
): { page: number; pageCount: number; skip: number } {
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(requestedPage, pageCount)
  return { page, pageCount, skip: (page - 1) * perPage }
}

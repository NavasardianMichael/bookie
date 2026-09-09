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

export type ProvidersListSort = 'recommended' | 'nameAsc' | 'nameDesc' | 'newest'

/**
 * `recommended` puts bookable providers first and freshest-edited next — the two signals
 * the schema actually carries. It is deliberately not a rating sort: `Review` has no
 * aggregate column, so ordering by it would mean an aggregate over every provider on
 * every page.
 */
const ORDER_BY: Record<ProvidersListSort, Prisma.ProviderOrderByWithRelationInput[]> = {
  recommended: [{ available: 'desc' }, { updatedAt: 'desc' }],
  nameAsc: [{ lastName: 'asc' }, { firstName: 'asc' }],
  nameDesc: [{ lastName: 'desc' }, { firstName: 'desc' }],
  newest: [{ createdAt: 'desc' }],
}

export const PROVIDERS_LIST_SORTS = Object.keys(ORDER_BY) as ProvidersListSort[]

type RawQuery = Record<string, unknown>

const asString = (raw: unknown): string => (typeof raw === 'string' ? raw : '')

const asFlag = (raw: unknown): boolean => raw === true || raw === 'true' || raw === '1'

const asSort = (raw: unknown): ProvidersListSort =>
  PROVIDERS_LIST_SORTS.find((sort) => sort === raw) ?? 'recommended'

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
    { services: { some: { name: { contains: term, mode: 'insensitive' } } } },
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

const weekdayOf = (now: Date): (typeof WEEKDAYS_SUNDAY_FIRST)[number] => WEEKDAYS_SUNDAY_FIRST[now.getDay()]!

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

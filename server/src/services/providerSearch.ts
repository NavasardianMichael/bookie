import { Prisma } from '@prisma/client'
import { seededCategoriesMatching } from '../lib/category-names.js'
import type { TermSpellings } from '../lib/searchCorrection.js'
import { providerDayParts, specialDateOn, toScheduleRule, toSpecialDates } from '../lib/service-availability.js'
import { SUPPORTED_TIME_ZONES, toTimeZone, wallClockInZone, weekdayInZone, type WeekdayName } from '../lib/time-zone.js'

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
  nameAsc: [{ fullName: 'asc' }],
  nameDesc: [{ fullName: 'desc' }],
  newest: [{ createdAt: 'desc' }],
}

export const PROVIDERS_LIST_SORTS = Object.keys(ORDER_BY) as ProvidersListSort[]

type RawQuery = Record<string, unknown>

const asString = (raw: unknown): string => (typeof raw === 'string' ? raw : '')

const asFlag = (raw: unknown): boolean => raw === true || raw === 'true' || raw === '1'

/** Whether a list request asks for `openToday` — the route fetches overrides only then. */
export const wantsOpenToday = (query: RawQuery): boolean => asFlag(query.openToday)

const asSort = (raw: unknown): ProvidersListSort => PROVIDERS_LIST_SORTS.find((sort) => sort === raw) ?? 'recommended'

const asPositiveInt = (raw: unknown, fallback: number, max: number): number => {
  const parsed = Number.parseInt(asString(raw), 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

const toSearchTerms = (raw: unknown): string[] =>
  asString(raw).trim().split(/\s+/).filter(Boolean).slice(0, SEARCH_TERM_LIMIT)

/**
 * The seeded categories one spelling names by a label in any language
 * (`lib/category-names.ts`) — "стоматология" is the Dentistry row, whose stored name is English.
 */
const translatedCategories = (term: string): Prisma.CategoryWhereInput[] => {
  const names = seededCategoriesMatching(term)
  return names.length ? [{ name: { in: names } }] : []
}

/**
 * Where one term is allowed to match. `description` is deliberately absent: it is the
 * longest column on the table and the weakest signal, and a service or category name
 * already answers "who does massage?" more precisely.
 *
 * A term is one or more spellings, any of which may match — a single one normally, several
 * on the retry `services/searchFallback.ts` makes after a search that found nothing.
 */
const matchesTerm = (spellings: TermSpellings): Prisma.ProviderWhereInput => ({
  OR: spellings.flatMap((term): Prisma.ProviderWhereInput[] => [
    { fullName: { contains: term, mode: 'insensitive' } },
    { organization: { name: { contains: term, mode: 'insensitive' } } },
    { services: { some: { name: { contains: term, mode: 'insensitive' }, active: true } } },
    { categories: { some: { category: { name: { contains: term, mode: 'insensitive' } } } } },
    ...translatedCategories(term).map((category) => ({ categories: { some: { category } } })),
  ]),
})

/**
 * The services a search is about, on a provider it found: active, and named by any of its
 * spellings. What the result card shows as the match, and counts as "+N more". Only
 * meaningful with at least one term.
 *
 * By name only: a service has no category of its own (categories are the provider's), so a
 * provider found through a category shows no matched service rather than one picked at random.
 */
export const matchedServicesWhere = (matched: readonly TermSpellings[]): Prisma.ServiceWhereInput => ({
  active: true,
  OR: matched.flat().map((term): Prisma.ServiceWhereInput => ({ name: { contains: term, mode: 'insensitive' } })),
})

export type ProvidersListQuery = {
  where: Prisma.ProviderWhereInput
  /** The query's words as matched — what `searchFallback.ts` corrects on an empty result. */
  terms: string[]
  /**
   * The spellings `where` was built from, one set per word — the typed words, or on the
   * corrected retry the words plus their corrections. What the matched service and the
   * relevance order are judged against, so they agree with the rows the filter let in.
   */
  matched: TermSpellings[]
  sort: ProvidersListSort
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

/**
 * The server process's own weekday — what "today" meant for every provider before
 * `Provider.timeZone` existed, and still means for one who has not set it.
 */
export const weekdayOf = (now: Date): (typeof WEEKDAYS_SUNDAY_FIRST)[number] => WEEKDAYS_SUNDAY_FIRST[now.getDay()]!

/**
 * Whether the provider has hours today, on their own calendar. Used by `mapBasicProvider` for
 * the card's Closed state. The provider's rule (weekly, days of the month, specific dates) and a
 * special date covering today both count — closed for a holiday, or open on a day the week is not.
 *
 * The Explore filter agrees through `specialDateOverrides`: the rows SQL cannot judge (a special
 * date today, or a rule other than weekly) are judged here, by this function, and handed to
 * `openTodayWhere` as ids.
 */
export function isOpenToday(
  weekSchedule: unknown,
  now: Date = new Date(),
  timeZone?: string | null,
  specialDates?: unknown,
  scheduleRule?: unknown
): boolean {
  const zone = toTimeZone(timeZone)
  // Without a zone, today is the server's own calendar day — the weekday `weekdayOf` has always used.
  const dayKey = zone ? wallClockInZone(now, zone).dayKey : serverDayKey(now)
  return (
    providerDayParts({
      weekSchedule,
      specialDates: toSpecialDates(specialDates),
      rule: toScheduleRule(scheduleRule),
      dayKey,
    }).length > 0
  )
}

/**
 * Today's hours live on `weekSchedule.<day>.availability.start` as `'HH:mm'`.
 * `string_contains: ':'` is a positive check so `''` and a missing key (new
 * accounts store `weekSchedule: {}`) do not match. This is not remaining-slot
 * math — that cannot stay in `count`/`findMany` without breaking pagination.
 */
const hasHoursOn = (weekday: WeekdayName): Prisma.ProviderWhereInput => ({
  weekSchedule: {
    path: [weekday, 'availability', 'start'],
    string_contains: ':',
  },
})

/**
 * "Open today" where today depends on the provider: at any instant the world spans two or
 * three weekdays, and Prisma cannot compute a weekday per row. So the zones are grouped by
 * the weekday it is in each of them *now*, and each group is one `IN` branch. That works
 * only because a stored zone is always a member of `SUPPORTED_TIME_ZONES` — `toTimeZone`
 * canonicalises on write. A provider with no zone keeps the server's weekday.
 */
const openTodayWhere = (now: Date, overrides: SpecialDateOverrides = NO_OVERRIDES): Prisma.ProviderWhereInput => {
  const zonesByWeekday = new Map<WeekdayName, string[]>()
  SUPPORTED_TIME_ZONES.forEach((zone) => {
    const weekday = weekdayInZone(now, zone)
    zonesByWeekday.set(weekday, [...(zonesByWeekday.get(weekday) ?? []), zone])
  })

  const settled = [...overrides.open, ...overrides.closed]
  // Only a weekly rule's hours live on `weekSchedule.<day>`; another rule keeps that column for
  // switching back, so it must not answer. And a provider a special date settles today is
  // answered by it alone, never by the weekly hours.
  const byWeek = (branch: Prisma.ProviderWhereInput): Prisma.ProviderWhereInput => ({
    ...branch,
    scheduleRule: { path: ['mode'], equals: 'weekdays' },
    ...(settled.length ? { id: { notIn: settled } } : {}),
  })

  return {
    OR: [
      byWeek({ timeZone: null, ...hasHoursOn(weekdayOf(now)) }),
      ...[...zonesByWeekday].map(([weekday, zones]) => byWeek({ timeZone: { in: zones }, ...hasHoursOn(weekday) })),
      ...(overrides.open.length ? [{ id: { in: overrides.open } }] : []),
    ],
  }
}

/**
 * The providers whose today SQL cannot judge, split by the answer: a special date on today, or a
 * rule other than weekly (days of the month, specific dates). SQL cannot say which calendar day
 * it is for each row, nor walk a list of date ranges per row through Prisma, so the filter takes
 * these as ids: the I/O half (`exploreResults.ts#loadSpecialDateOverrides`) fetches every such
 * row, and this judges each with `isOpenToday` — the card's own predicate, so the two cannot
 * disagree.
 */
export type SpecialDateOverrides = { open: string[]; closed: string[] }

const NO_OVERRIDES: SpecialDateOverrides = { open: [], closed: [] }

export type SpecialDateRow = {
  id: string
  weekSchedule: unknown
  timeZone: string | null
  specialDates: unknown
  scheduleRule?: unknown
}

/** The server's own calendar day — "today" for a provider with no zone, as in `isOpenToday`. */
const serverDayKey = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/**
 * The first and last calendar day it is anywhere a provider can be, right now — at most three
 * consecutive days. `'YYYY-MM-DD'` compares as text, which is how the SQL reads it.
 */
export function todaySpan(now: Date): { from: string; to: string } {
  const days = [serverDayKey(now), ...SUPPORTED_TIME_ZONES.map((zone) => wallClockInZone(now, zone).dayKey)].sort()
  return { from: days[0]!, to: days[days.length - 1]! }
}

export function specialDateOverrides(rows: readonly SpecialDateRow[], now: Date): SpecialDateOverrides {
  const overrides: SpecialDateOverrides = { open: [], closed: [] }
  rows.forEach((row) => {
    const zone = toTimeZone(row.timeZone)
    const dayKey = zone ? wallClockInZone(now, zone).dayKey : serverDayKey(now)
    const weekly = toScheduleRule(row.scheduleRule).mode === 'weekdays'
    // Touching the span is not covering this provider's today — a weekly rule's hours still answer.
    if (weekly && !specialDateOn(toSpecialDates(row.specialDates), dayKey)) return
    const open = isOpenToday(row.weekSchedule, now, row.timeZone, row.specialDates, row.scheduleRule)
    overrides[open ? 'open' : 'closed'].push(row.id)
  })
  return overrides
}

/**
 * `spellings` replaces the words of `q` with a set of spellings per word — the corrected
 * retry. `terms` in the result stays the words as typed. `overrides` is what special dates
 * decide today (`specialDateOverrides`); without it `openToday` reads the weekly hours alone.
 */
export function parseProvidersListQuery(
  query: RawQuery,
  now: Date = new Date(),
  spellings?: readonly TermSpellings[],
  overrides?: SpecialDateOverrides
): ProvidersListQuery {
  const terms = toSearchTerms(query.q)
  const matched = spellings ? [...spellings] : terms.map((term) => [term])
  const categoryId = asString(query.categoryId)
  const sort = asSort(query.sort)

  return {
    where: {
      ...PUBLIC_PROVIDER_WHERE,
      // Terms live under `AND` so they cannot collide with the `categories` /
      // `services` keys a search term owns.
      ...(matched.length ? { AND: matched.map(matchesTerm) } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      ...(asFlag(query.available) ? { available: true } : {}),
      ...(asFlag(query.openToday) ? openTodayWhere(now, overrides) : {}),
    },
    terms,
    matched,
    sort,
    orderBy: ORDER_BY[sort],
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

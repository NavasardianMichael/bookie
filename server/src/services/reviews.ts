/**
 * The review domain's pure logic: the ranking formula, the body and query parsers, and
 * the aggregate recompute.
 *
 * It lives here rather than in the route for the reason `providerSearch.ts` gives — the
 * parsing is testable and the route stays a thin handler — and with the constraint
 * `tests/CLAUDE.md` imposes: `pnpm test` spins up no Express app and no database, so a
 * server module is only reachable from a spec if it imports nothing that pulls in
 * `config.js`. Nothing here does. `recomputeProviderRating` takes its client as a
 * parameter instead of importing the Prisma singleton, which is what keeps that true.
 */

/** Matches `MAX_CHARS_FOR_TEXTAREA` in `src/constants/form.ts`, which draws the counter. */
export const MAX_REVIEW_COMMENT_LENGTH = 300

/** Matches the reason box in `ReportReviewSheet`, and `MAX_CHARS_FOR_TEXTAREA` above. */
export const MAX_REPORT_REASON_LENGTH = 300

/** Matches the reply box on the provider's own review card. */
export const MAX_REVIEW_REPLY_LENGTH = 300

export const REVIEWS_PAGE_SIZE = 5
const REVIEWS_MAX_PAGE_SIZE = 50

/**
 * The prior the Bayesian score shrinks toward, and how many reviews it takes to outweigh
 * it.
 *
 * Fixed constants, deliberately, rather than the live global mean. Prisma's `orderBy`
 * cannot compute, so the score has to be a stored column — and a prior derived from the
 * corpus would mean every review anywhere dirtied every provider row. The cost of fixing
 * them is that the prior drifts from reality as the corpus grows; the cost of not fixing
 * them is a full-table write amplification on every review.
 *
 * `PRIOR_WEIGHT = 10` is the knob worth understanding: it is "how many reviews before the
 * provider's own average matters more than the prior". Ten is enough that a single 5★
 * lands on 4.09 rather than at the top of the page, and low enough that a genuinely good
 * provider overtakes the prior within a month of real use.
 */
export const PRIOR_MEAN = 4
export const PRIOR_WEIGHT = 10

/**
 * The Explore sort key.
 *
 * At zero reviews this returns exactly `PRIOR_MEAN`, which is why `Provider.ratingScore`
 * defaults to 4 — an unrated provider ranks mid-pack instead of below every rated one.
 * A marketplace that buries everyone who has not been reviewed yet never lets anyone
 * earn a first review.
 */
export const bayesianScore = (ratingSum: number, ratingCount: number): number =>
  (PRIOR_WEIGHT * PRIOR_MEAN + ratingSum) / (PRIOR_WEIGHT + ratingCount)

export type RatingAggregate = {
  ratingCount: number
  ratingSum: number
  ratingAvg: number
  ratingScore: number
}

/** The four denormalised columns, from the two numbers a `SUM`/`COUNT` yields. */
export const toRatingAggregate = (ratingSum: number, ratingCount: number): RatingAggregate => ({
  ratingCount,
  ratingSum,
  // Guarded because `0/0` is NaN, and a NaN reaching a `DOUBLE PRECISION` column would
  // make every comparison against it false — the provider would vanish from every sort
  // rather than fail loudly.
  ratingAvg: ratingCount ? ratingSum / ratingCount : 0,
  ratingScore: bayesianScore(ratingSum, ratingCount),
})

/** 1–5, as the histogram under the summary renders it. Index 0 is one star. */
export type RatingDistribution = [number, number, number, number, number]

export const ratingDistribution = (ratings: number[]): RatingDistribution => {
  const buckets: RatingDistribution = [0, 0, 0, 0, 0]
  for (const rating of ratings) {
    // Anything out of range is dropped rather than clamped into a neighbouring bucket:
    // the CHECK constraint means it cannot occur, and silently counting it as a 5 would
    // be the one outcome worse than not counting it at all.
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) buckets[rating - 1] += 1
  }
  return buckets
}

/**
 * The same histogram, from a `groupBy` that has already counted.
 *
 * This is what the route uses. `ratingDistribution` above takes individual ratings, so
 * feeding it a grouped result means expanding the counts back into one element per
 * review — a 10,000-element array built and thrown away on every page load of a
 * well-reviewed provider, to produce five numbers the database already had.
 */
export const distributionFromCounts = (rows: { rating: number; count: number }[]): RatingDistribution => {
  const buckets: RatingDistribution = [0, 0, 0, 0, 0]
  for (const { rating, count } of rows) {
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) buckets[rating - 1] += count
  }
  return buckets
}

/**
 * Only the two orderings a review list needs. `helpful` and `rating` are absent for the
 * same reason the Explore filters are: there is no vote column, and sorting by rating
 * turns a reputation into a highlight reel.
 */
export type ReviewsListSort = 'newest' | 'oldest'

export const REVIEWS_LIST_SORTS: ReviewsListSort[] = ['newest', 'oldest']

type RawQuery = Record<string, unknown>

const asString = (raw: unknown): string => (typeof raw === 'string' ? raw : '')

const asSort = (raw: unknown): ReviewsListSort =>
  REVIEWS_LIST_SORTS.find((sort) => sort === raw) ?? 'newest'

/** As `providerSearch.ts`'s: any non-integer, zero or negative resolves to the fallback. */
const asPositiveInt = (raw: unknown, fallback: number, max: number): number => {
  const parsed = Number.parseInt(asString(raw), 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export type ReviewsListQuery = {
  sort: ReviewsListSort
  /** 1-based, as requested. Clamped against the real page count by `resolvePageWindow`. */
  page: number
  perPage: number
}

export const parseReviewsListQuery = (query: RawQuery): ReviewsListQuery => ({
  sort: asSort(query.sort),
  page: asPositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER),
  perPage: asPositiveInt(query.perPage, REVIEWS_PAGE_SIZE, REVIEWS_MAX_PAGE_SIZE),
})

export type ParsedReviewBody = { rating: number; comment?: string }

/**
 * Thrown for anything a caller got wrong, and translated to an `HttpError` by the route.
 *
 * A plain error class rather than `HttpError` because that type lives in
 * `middleware/error.ts`, which imports Express — and importing Express here would put
 * this module out of reach of `pnpm test`, which is the whole reason it exists.
 */
export class ReviewValidationError extends Error {}

const parseComment = (raw: unknown, max: number, field: string): string | undefined => {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'string') throw new ReviewValidationError(`${field} must be text`)

  const trimmed = raw.trim()
  if (!trimmed) return undefined

  /**
   * **Rejected, not truncated** — deviating from `asBoundedString`'s house rule for the
   * reason `parseNotes` in `routes/appointments.ts` gives: the browser counts this field
   * against the same cap, so a longer body means a non-browser caller. Silently storing
   * the first 300 characters of someone's review publishes a sentence they did not
   * finish writing, under their name.
   */
  if (trimmed.length > max) {
    throw new ReviewValidationError(`${field} must be ${max} characters or fewer`)
  }
  return trimmed
}

/**
 * `rating` is required and must be an integer 1–5.
 *
 * `'5'` is refused along with `5.5`: JSON carries real numbers, so a string here means
 * the caller is guessing at the contract, and coercing it would let `'5abc'` through
 * `parseInt` as a five.
 */
export const parseReviewBody = (body: unknown): ParsedReviewBody => {
  const raw = (body ?? {}) as Record<string, unknown>
  const rating = raw.rating

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewValidationError('Rating must be a whole number between 1 and 5')
  }

  return { rating, comment: parseComment(raw.comment, MAX_REVIEW_COMMENT_LENGTH, 'Comment') }
}

/** The reason is the whole report, so unlike a review comment it is required. */
export const parseReportReason = (body: unknown): string => {
  const raw = (body ?? {}) as Record<string, unknown>
  const reason = parseComment(raw.reason, MAX_REPORT_REASON_LENGTH, 'Reason')
  if (!reason) throw new ReviewValidationError('Tell us what is wrong with this review')
  return reason
}

/** Required too: an empty reply would publish a blank answer under the review. */
export const parseReplyBody = (body: unknown): string => {
  const raw = (body ?? {}) as Record<string, unknown>
  const reply = parseComment(raw.reply, MAX_REVIEW_REPLY_LENGTH, 'Reply')
  if (!reply) throw new ReviewValidationError('Reply cannot be empty')
  return reply
}

/**
 * A reviewer is named by their first name and a last initial — never the full surname,
 * never an id, never an address.
 *
 * `server/CLAUDE.md`'s "Consumers are never public" deleted `GET /consumers` for
 * returning names and phone numbers to anyone who asked. A review has to be attributable
 * to be worth reading, so this is the smallest thing that attributes it: enough for the
 * provider to recognise a real customer, not enough to identify a stranger. The payload
 * carries no consumer id at all, so there is nothing to look anybody up by.
 */
export const reviewAuthorName = (firstName: string, lastName: string): string => {
  const initial = lastName.trim().charAt(0)
  return initial ? `${firstName.trim()} ${initial.toUpperCase()}.` : firstName.trim()
}

/**
 * The minimum of a Prisma client this module needs, so it can take a transaction client
 * without importing `@prisma/client` — which would drag `config.js` in behind it.
 */
type RatingAggregateClient = {
  review: {
    aggregate: (args: {
      where: { providerId: string; hiddenAt: null }
      _sum: { rating: true }
      _count: true
    }) => Promise<{ _sum: { rating: number | null }; _count: number }>
  }
  provider: {
    update: (args: { where: { id: string }; data: RatingAggregate }) => Promise<unknown>
  }
}

/**
 * Rewrites a provider's four rating columns from their visible reviews.
 *
 * **Recomputed, not incremented.** A `+= rating` delta is cheaper and goes quietly wrong
 * the first time a review is edited, hidden, restored, or cascaded away by an account
 * deletion — and a wrong aggregate is a wrong sort order that nothing surfaces as an
 * error. One aggregate over one provider's reviews is paid on a review write, which is
 * rare; the cost `docs/BACKLOG.md` refused was an aggregate per provider per *page
 * render*, which this is not.
 *
 * Call it inside the same transaction as the write it follows, so a failure cannot leave
 * the row and the aggregate disagreeing.
 */
export const recomputeProviderRating = async (
  client: RatingAggregateClient,
  providerId: string
): Promise<RatingAggregate> => {
  const { _sum, _count } = await client.review.aggregate({
    // Hidden reviews count toward nothing: a review removed for abuse must not keep
    // dragging the score it was written to damage.
    where: { providerId, hiddenAt: null },
    _sum: { rating: true },
    _count: true,
  })

  const aggregate = toRatingAggregate(_sum.rating ?? 0, _count)
  await client.provider.update({ where: { id: providerId }, data: aggregate })
  return aggregate
}

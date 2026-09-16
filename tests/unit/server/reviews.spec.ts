import { describe, expect, it } from 'vitest'
import {
  bayesianScore,
  distributionFromCounts,
  MAX_REVIEW_COMMENT_LENGTH,
  parseReplyBody,
  parseReportReason,
  parseReviewBody,
  parseReviewsListQuery,
  PRIOR_MEAN,
  ratingDistribution,
  recomputeProviderRating,
  reviewAuthorName,
  REVIEWS_PAGE_SIZE,
  ReviewValidationError,
  toRatingAggregate,
} from '../../../server/src/services/reviews.js'

/**
 * `server/` has no path alias, so these import by relative path — and this module is
 * reachable from a spec at all only because it imports nothing that pulls in
 * `config.js`. Keep it that way.
 */

describe('bayesianScore', () => {
  // The reason `Provider.ratingScore` defaults to 4 rather than 0, and the reason an
  // unrated provider is not buried on the last page of Explore forever.
  it('returns the prior when there are no reviews', () => {
    expect(bayesianScore(0, 0)).toBe(PRIOR_MEAN)
  })

  // The whole point of shrinking toward a prior: one perfect review is not evidence.
  it('does not let a single 5★ outrank a well-reviewed provider', () => {
    const lucky = bayesianScore(5, 1)
    const established = bayesianScore(4.7 * 40, 40)

    expect(lucky).toBeLessThan(established)
    expect(lucky).toBeCloseTo(4.09, 2)
  })

  it('converges on the true average as reviews accumulate', () => {
    expect(bayesianScore(5 * 1000, 1000)).toBeCloseTo(5, 1)
  })

  it('moves below the prior for genuinely bad ratings', () => {
    expect(bayesianScore(1 * 20, 20)).toBeLessThan(PRIOR_MEAN)
  })
})

describe('toRatingAggregate', () => {
  it('derives the average from the integer sum', () => {
    expect(toRatingAggregate(14, 4)).toMatchObject({ ratingCount: 4, ratingSum: 14, ratingAvg: 3.5 })
  })

  // `0/0` is NaN, and a NaN in a DOUBLE PRECISION column makes every comparison against
  // it false — the provider would vanish from every sort rather than fail loudly.
  it('reports 0, not NaN, for a provider with no reviews', () => {
    const aggregate = toRatingAggregate(0, 0)

    expect(aggregate.ratingAvg).toBe(0)
    expect(Number.isNaN(aggregate.ratingAvg)).toBe(false)
    expect(aggregate.ratingScore).toBe(PRIOR_MEAN)
  })
})

describe('ratingDistribution', () => {
  it('counts each star into its own bucket, one-indexed', () => {
    expect(ratingDistribution([5, 5, 4, 1])).toEqual([1, 0, 0, 1, 2])
  })

  it('is all zeroes for no ratings', () => {
    expect(ratingDistribution([])).toEqual([0, 0, 0, 0, 0])
  })

  // Dropped rather than clamped: counting a stray 7 as a 5 would be the one outcome
  // worse than not counting it.
  it('drops a value outside 1-5 instead of clamping it into a neighbouring bucket', () => {
    expect(ratingDistribution([0, 6, 3, 2.5])).toEqual([0, 0, 1, 0, 0])
  })
})

describe('distributionFromCounts', () => {
  // What the route actually calls. Expanding a groupBy back into one element per review
  // would build a 10,000-element array on every page load of a well-reviewed provider,
  // to produce five numbers the database had already counted.
  it('sums grouped counts into their buckets', () => {
    expect(distributionFromCounts([{ rating: 5, count: 12 }, { rating: 3, count: 2 }])).toEqual([
      0, 0, 2, 0, 12,
    ])
  })

  it('agrees with ratingDistribution over the same data', () => {
    const individual = [5, 5, 4, 1, 1, 1]
    const grouped = [
      { rating: 5, count: 2 },
      { rating: 4, count: 1 },
      { rating: 1, count: 3 },
    ]

    expect(distributionFromCounts(grouped)).toEqual(ratingDistribution(individual))
  })

  it('is all zeroes for an empty group', () => {
    expect(distributionFromCounts([])).toEqual([0, 0, 0, 0, 0])
  })
})

describe('parseReviewBody', () => {
  it('accepts a whole number 1-5 with a comment', () => {
    expect(parseReviewBody({ rating: 4, comment: '  Great  ' })).toEqual({ rating: 4, comment: 'Great' })
  })

  it('treats a blank comment as absent', () => {
    expect(parseReviewBody({ rating: 4, comment: '   ' }).comment).toBeUndefined()
  })

  it.each([0, 6, 2.5, -1])('rejects %s as a rating', (rating) => {
    expect(() => parseReviewBody({ rating })).toThrow(ReviewValidationError)
  })

  // JSON carries real numbers, so a string means the caller is guessing at the contract.
  // Coercing would also let `'5abc'` through `parseInt` as a five.
  it('rejects a numeric string rather than coercing it', () => {
    expect(() => parseReviewBody({ rating: '5' })).toThrow(ReviewValidationError)
  })

  it('rejects a missing rating', () => {
    expect(() => parseReviewBody({ comment: 'no stars' })).toThrow(ReviewValidationError)
    expect(() => parseReviewBody(undefined)).toThrow(ReviewValidationError)
  })

  /**
   * Rejected, not truncated — the deviation from `asBoundedString`'s house rule that
   * `parseNotes` in `routes/appointments.ts` also makes. Storing the first 300 characters
   * would publish an unfinished sentence under someone's name.
   */
  it('rejects an over-long comment instead of truncating it', () => {
    const tooLong = 'x'.repeat(MAX_REVIEW_COMMENT_LENGTH + 1)

    expect(() => parseReviewBody({ rating: 5, comment: tooLong })).toThrow(ReviewValidationError)
  })

  it('accepts a comment exactly at the cap', () => {
    const exact = 'x'.repeat(MAX_REVIEW_COMMENT_LENGTH)

    expect(parseReviewBody({ rating: 5, comment: exact }).comment).toHaveLength(MAX_REVIEW_COMMENT_LENGTH)
  })
})

describe('parseReportReason / parseReplyBody', () => {
  it('requires a reason', () => {
    expect(() => parseReportReason({ reason: '  ' })).toThrow(ReviewValidationError)
    expect(parseReportReason({ reason: ' spam ' })).toBe('spam')
  })

  it('requires a reply', () => {
    expect(() => parseReplyBody({})).toThrow(ReviewValidationError)
    expect(parseReplyBody({ reply: 'Thanks!' })).toBe('Thanks!')
  })
})

describe('parseReviewsListQuery', () => {
  it('defaults to newest, page 1, the standard page size', () => {
    expect(parseReviewsListQuery({})).toEqual({ sort: 'newest', page: 1, perPage: REVIEWS_PAGE_SIZE })
  })

  it('accepts the sorts it declares', () => {
    expect(parseReviewsListQuery({ sort: 'oldest' }).sort).toBe('oldest')
  })

  // A hostile or hand-edited value resolves to the default rather than reaching Prisma.
  it('degrades an unknown sort to the default', () => {
    expect(parseReviewsListQuery({ sort: 'drop table' }).sort).toBe('newest')
  })

  it('clamps perPage and refuses a non-positive page', () => {
    expect(parseReviewsListQuery({ perPage: '9999' }).perPage).toBe(50)
    expect(parseReviewsListQuery({ page: '0' }).page).toBe(1)
    expect(parseReviewsListQuery({ page: 'nope' }).page).toBe(1)
  })
})

describe('reviewAuthorName', () => {
  // "Consumers are never public" — enough to attribute a review, not enough to identify
  // a stranger. The payload carries no consumer id at all.
  it('reduces the surname to an initial', () => {
    expect(reviewAuthorName('Anna', 'Petrosyan')).toBe('Anna P.')
  })

  it('omits the initial when there is no surname', () => {
    expect(reviewAuthorName('Anna', '  ')).toBe('Anna')
  })
})

describe('recomputeProviderRating', () => {
  /** The two calls the real Prisma client would make, captured. */
  const clientFor = (sum: number | null, count: number) => {
    const writes: unknown[] = []
    return {
      writes,
      client: {
        review: { aggregate: async () => ({ _sum: { rating: sum }, _count: count }) },
        provider: {
          update: async (args: unknown) => {
            writes.push(args)
            return args
          },
        },
      },
    }
  }

  it('writes all four columns from the visible reviews', async () => {
    const { client, writes } = clientFor(14, 4)

    const aggregate = await recomputeProviderRating(client, 'p1')

    expect(aggregate).toEqual({
      ratingCount: 4,
      ratingSum: 14,
      ratingAvg: 3.5,
      ratingScore: bayesianScore(14, 4),
    })
    expect(writes).toEqual([{ where: { id: 'p1' }, data: aggregate }])
  })

  // What happens when the last review is deleted, or the only one is hidden: the
  // provider must return to the prior, not keep the score it had.
  it('resets to the prior when the last review goes away', async () => {
    const { client } = clientFor(null, 0)

    await expect(recomputeProviderRating(client, 'p1')).resolves.toEqual({
      ratingCount: 0,
      ratingSum: 0,
      ratingAvg: 0,
      ratingScore: PRIOR_MEAN,
    })
  })
})

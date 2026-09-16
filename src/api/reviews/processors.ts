import {
  GetProviderReviewsAPI,
  GetReviewReportsAPI,
  PostProviderReviewAPI,
  PostReviewReplyAPI,
  PutReviewAPI,
} from './types'

/**
 * The empty page an unrated provider answers with.
 *
 * Built rather than left `undefined` so the section renders its "no reviews yet" state
 * from the same shape as a populated one — a component that has to handle both a missing
 * summary and a zero-count summary has two empty states and will get one of them wrong.
 */
const emptyReviews = (): GetProviderReviewsAPI['processed'] => ({
  items: [],
  total: 0,
  page: 1,
  perPage: 0,
  pageCount: 1,
  summary: { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] },
  viewer: {},
})

/**
 * Kept as an array rather than normalized into `{ allIds, byId }`.
 *
 * Reviews are rendered in the order the API sorted them and are never looked up by id —
 * the same reasoning `processProviderBookingsResponse` follows. Normalizing would mean
 * rebuilding that order from `allIds` on every render for no lookup anyone performs.
 */
export const processProviderReviewsResponse: GetProviderReviewsAPI['processor'] = (response) => {
  const value = response.value
  if (!value) return emptyReviews()

  return {
    ...value,
    items: value.items ?? [],
    // `?? {}` so a payload from a build that predates `viewer` reads as "this visitor may
    // do nothing", which is the safe direction — the CTA hides rather than 401s on submit.
    viewer: value.viewer ?? {},
  }
}

export const processReviewResponse: PostProviderReviewAPI['processor'] = (response) =>
  response.value as PostProviderReviewAPI['processed']

export const processUpdatedReviewResponse: PutReviewAPI['processor'] = (response) =>
  response.value as PutReviewAPI['processed']

export const processReviewReplyResponse: PostReviewReplyAPI['processor'] = (response) =>
  response.value as PostReviewReplyAPI['processed']

export const processReviewReportsResponse: GetReviewReportsAPI['processor'] = (response) => {
  const value = response.value
  if (!value) return { items: [], total: 0, page: 1, perPage: 0, pageCount: 1 }

  return { ...value, items: value.items ?? [] }
}

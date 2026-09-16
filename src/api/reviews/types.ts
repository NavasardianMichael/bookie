import { ProviderProfile } from '@store/providers/profile/types'
import {
  Review,
  ReviewReportsList,
  ReviewReportStatus,
  ReviewsList,
  ReviewsListSort,
} from '@store/reviews/list/types'
import { Endpoint } from '@interfaces/api'

export type ReviewsListResponse = ReviewsList

/**
 * Explore's query string shape, minus the filters a review list has no use for. Every
 * field optional — an omitted one means "the API's default", never "false".
 */
export type ReviewsListQuery = Partial<{
  sort: ReviewsListSort
  /** 1-based. The API clamps it to the last real page. */
  page: number
  perPage: number
}>

export type GetProviderReviewsAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    /**
     * Transport-only, as `GetSingleProviderAPI`'s is: a Server Component forwards the
     * incoming session so `viewer` and `isMine` can be resolved. Never a query field.
     */
    cookie?: string
    query?: ReviewsListQuery
  }
  response: ReviewsListResponse
  processed: ReviewsListResponse
}>

/**
 * `appointmentId` is what makes the review earned rather than asserted — the API
 * verifies it belongs to the caller, is with this provider, and has already happened.
 * The client takes it from `viewer.eligibleAppointmentId` and never invents one.
 */
export type PostProviderReviewRequestPayload = {
  providerId: ProviderProfile['id']
  appointmentId: string
  rating: number
  comment?: string
}

export type PostProviderReviewAPI = Endpoint<{
  payload: PostProviderReviewRequestPayload
  response: Review
  processed: Review
}>

export type PutReviewAPI = Endpoint<{
  payload: {
    id: Review['id']
    rating: number
    /** `''` clears the comment. Omitting it would leave the old text under a new rating. */
    comment?: string
  }
  response: Review
  processed: Review
}>

export type DeleteReviewAPI = Endpoint<{
  payload: { id: Review['id'] }
}>

export type PostReviewReplyAPI = Endpoint<{
  payload: { id: Review['id']; reply: string }
  response: Review
  processed: Review
}>

export type PostReviewReportAPI = Endpoint<{
  payload: { id: Review['id']; reason: string }
}>

/* --- Admin ---------------------------------------------------------------- */

export type ReviewReportsQuery = Partial<{
  status: ReviewReportStatus
  page: number
  perPage: number
}>

export type GetReviewReportsAPI = Endpoint<{
  payload: ReviewReportsQuery | void
  response: ReviewReportsList
  processed: ReviewReportsList
}>

export type PatchReviewVisibilityAPI = Endpoint<{
  payload: {
    id: Review['id']
    hidden: boolean
    /** Why it was hidden. Never published — the public payload omits it entirely. */
    reason?: string
  }
}>

export type PatchReviewReportAPI = Endpoint<{
  payload: {
    id: string
    /** `open` is refused by the API: closing a report is the only transition offered. */
    status: Exclude<ReviewReportStatus, 'open'>
  }
}>

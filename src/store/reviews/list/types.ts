import { ProviderProfile } from '@store/providers/profile/types'

/**
 * Review entity types.
 *
 * They live under `src/store/` rather than in `src/api/` because that is where every
 * entity type in this codebase lives — the dependency arrow is `api/types.ts →
 * store/types.ts`, never the reverse. There is **no store slice here**: the provider
 * page's review section is a Server Component and the write paths are local component
 * state, so nothing needs a shared client store. The directory exists for the types.
 */

export type Review = {
  id: string
  /**
   * `"Anna P."` — first name and a last initial, composed on the server.
   *
   * The payload carries no consumer id, email or phone, so this is the only thing
   * identifying the author, deliberately (`server/CLAUDE.md`, "Consumers are never
   * public"). Nothing here can be used to look anyone up.
   */
  author: string
  /** 1–5, integer. Bounded by a CHECK constraint, not just by the route. */
  rating: number
  comment?: string
  /** The provider's public answer, if they have given one. */
  reply?: string
  repliedAt?: string
  createdAt: string
  /** Present **only** when the review has been edited, so "edited" needs no comparison. */
  updatedAt?: string
  /** Server-computed from the session. The client never compares author ids. */
  isMine: boolean
}

/** 1–5, index 0 is one star. The histogram under the summary. */
export type RatingDistribution = [number, number, number, number, number]

export type ReviewsSummary = {
  average: number
  count: number
  distribution: RatingDistribution
}

/**
 * What this viewer may do about this provider's reviews, decided entirely on the server.
 *
 * `eligibleAppointmentId` **is** the eligibility rule: it is present only when the
 * viewer has a past, non-cancelled, not-yet-reviewed appointment with this provider. The
 * client renders a CTA when it has an id to submit and nothing when it does not — it
 * never evaluates the rule itself, so the rule cannot drift between the two.
 */
export type ReviewsViewer = {
  eligibleAppointmentId?: string
  myReviewId?: string
  /**
   * The viewer is the provider this page belongs to, so they may reply and report —
   * and may never review. Computed on the server, which has already compared the
   * session against the provider to decide whether an unlisted page is visible at all.
   */
  isProviderOwner?: boolean
}

export type ReviewsListPagination = {
  total: number
  page: number
  perPage: number
  pageCount: number
}

export type ReviewsList = {
  items: Review[]
  summary: ReviewsSummary
  viewer: ReviewsViewer
} & ReviewsListPagination

/** Mirrors the sorts `server/src/services/reviews.ts` accepts. */
export type ReviewsListSort = 'newest' | 'oldest'

/** The admin queue's row: the report, plus enough of the review to judge it. */
export type ReviewReport = {
  id: string
  reason: string
  status: ReviewReportStatus
  createdAt: string
  resolvedAt?: string
  review: Review & {
    /** Admin-only. The public payload omits moderation state entirely. */
    isHidden: boolean
    providerId?: ProviderProfile['id']
    providerName?: string
  }
}

export type ReviewReportStatus = 'open' | 'resolved' | 'dismissed'

export const REVIEW_REPORT_STATUSES: ReviewReportStatus[] = ['open', 'resolved', 'dismissed']

export type ReviewReportsList = {
  items: ReviewReport[]
} & ReviewsListPagination

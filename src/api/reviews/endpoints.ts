export const ENDPOINTS = {
  /** `/providers/<id>/reviews` — the id is interpolated in `main.ts`, never stored here. */
  getProviderReviews: '/providers',
  postProviderReview: '/providers',
  putReview: '/reviews',
  deleteReview: '/reviews',
  /** `/reviews/<id>/reply` — the provider's public answer. */
  postReviewReply: '/reviews',
  /** `/reviews/<id>/report` — the abuse report that reaches the admin queue. */
  postReviewReport: '/reviews',
  getReviewReports: '/admin/reviews/reports',
  patchReviewVisibility: '/admin/reviews',
  patchReviewReport: '/admin/reviews/reports',
} as const

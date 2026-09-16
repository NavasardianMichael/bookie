import { cache } from 'react'
import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import {
  processProviderReviewsResponse,
  processReviewReplyResponse,
  processReviewReportsResponse,
  processReviewResponse,
  processUpdatedReviewResponse,
} from './processors'
import {
  DeleteReviewAPI,
  GetProviderReviewsAPI,
  GetReviewReportsAPI,
  PatchReviewReportAPI,
  PatchReviewVisibilityAPI,
  PostProviderReviewAPI,
  PostReviewReplyAPI,
  PostReviewReportAPI,
  PutReviewAPI,
} from './types'

/**
 * Dedupes the review section and anything else reading the same page within one request.
 *
 * Keyed on **primitives**, deliberately: `cache` keys on argument identity, so an object
 * argument would never hit. That is why the query is flattened to a string here rather
 * than passed through as the object the caller holds.
 */
const fetchProviderReviews = cache(async (providerId: string, queryString: string, cookie: string) => {
  const url = `${ENDPOINTS.getProviderReviews}/${providerId}/reviews${queryString ? `?${queryString}` : ''}`
  const { data } = await axiosInstance.get<APIResponse<GetProviderReviewsAPI['response']>>(
    url,
    cookie ? { headers: { Cookie: cookie } } : undefined
  )
  return processProviderReviewsResponse(data)
})

export const getProviderReviewsAPI: GetProviderReviewsAPI['api'] = async (args) =>
  fetchProviderReviews(args.providerId, paramsToQueryString({ ...args.query }), args.cookie ?? '')

export const postProviderReviewAPI: PostProviderReviewAPI['api'] = async ({ providerId, ...body }) => {
  const { data } = await axiosInstance.post<APIResponse<PostProviderReviewAPI['response']>>(
    `${ENDPOINTS.postProviderReview}/${providerId}/reviews`,
    body
  )
  return processReviewResponse(data)
}

export const putReviewAPI: PutReviewAPI['api'] = async ({ id, ...body }) => {
  const { data } = await axiosInstance.patch<APIResponse<PutReviewAPI['response']>>(
    `${ENDPOINTS.putReview}/${id}`,
    body
  )
  return processUpdatedReviewResponse(data)
}

export const deleteReviewAPI: DeleteReviewAPI['api'] = async ({ id }) => {
  await axiosInstance.delete<APIResponse<DeleteReviewAPI['response']>>(`${ENDPOINTS.deleteReview}/${id}`)
}

export const postReviewReplyAPI: PostReviewReplyAPI['api'] = async ({ id, reply }) => {
  const { data } = await axiosInstance.post<APIResponse<PostReviewReplyAPI['response']>>(
    `${ENDPOINTS.postReviewReply}/${id}/reply`,
    { reply }
  )
  return processReviewReplyResponse(data)
}

export const postReviewReportAPI: PostReviewReportAPI['api'] = async ({ id, reason }) => {
  await axiosInstance.post<APIResponse<PostReviewReportAPI['response']>>(
    `${ENDPOINTS.postReviewReport}/${id}/report`,
    { reason }
  )
}

/* --- Admin ---------------------------------------------------------------- */

export const getReviewReportsAPI: GetReviewReportsAPI['api'] = async (query) => {
  const queryString = paramsToQueryString({ ...query })
  const { data } = await axiosInstance.get<APIResponse<GetReviewReportsAPI['response']>>(
    queryString ? `${ENDPOINTS.getReviewReports}?${queryString}` : ENDPOINTS.getReviewReports
  )
  return processReviewReportsResponse(data)
}

export const patchReviewVisibilityAPI: PatchReviewVisibilityAPI['api'] = async ({ id, ...body }) => {
  await axiosInstance.patch<APIResponse<PatchReviewVisibilityAPI['response']>>(
    `${ENDPOINTS.patchReviewVisibility}/${id}/visibility`,
    body
  )
}

export const patchReviewReportAPI: PatchReviewReportAPI['api'] = async ({ id, status }) => {
  await axiosInstance.patch<APIResponse<PatchReviewReportAPI['response']>>(
    `${ENDPOINTS.patchReviewReport}/${id}`,
    { status }
  )
}

import { describe, expect, it } from 'vitest'
import {
  processProviderReviewsResponse,
  processReviewReportsResponse,
  processReviewResponse,
} from '@api/reviews/processors'
import { Review, ReviewsList } from '@store/reviews/list/types'
import { APIResponse } from '@interfaces/api'

/** The server envelope every processor takes. */
const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const review = (id: string, overrides: Partial<Review> = {}): Review => ({
  id,
  author: 'Anna P.',
  rating: 5,
  createdAt: '2026-09-01T10:00:00.000Z',
  isMine: false,
  ...overrides,
})

const page = (items: Review[], overrides: Partial<ReviewsList> = {}): ReviewsList => ({
  items,
  total: items.length,
  page: 1,
  perPage: 5,
  pageCount: 1,
  summary: { average: 5, count: items.length, distribution: [0, 0, 0, 0, items.length] },
  viewer: {},
  ...overrides,
})

describe('processProviderReviewsResponse', () => {
  /**
   * Kept as an array, deliberately — reviews render in the order the API sorted them and
   * are never looked up by id, so normalizing to `{ allIds, byId }` would mean rebuilding
   * that order on every render for a lookup nobody performs.
   */
  it('preserves the API order rather than normalizing', () => {
    const items = [review('a'), review('b'), review('c')]

    expect(processProviderReviewsResponse(envelope(page(items))).items.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  // The API clamps an out-of-range page, so the pager has to render the window that came
  // back rather than the one that was asked for.
  it('passes the served window through verbatim', () => {
    const served = page([review('a')], { page: 3, perPage: 5, pageCount: 3, total: 11 })

    expect(processProviderReviewsResponse(envelope(served))).toMatchObject({
      page: 3,
      perPage: 5,
      pageCount: 3,
      total: 11,
    })
  })

  /**
   * The empty page is built rather than left undefined so the section renders its "no
   * reviews yet" state from the same shape as a populated one — otherwise the component
   * has two empty states and will get one of them wrong.
   */
  it('answers a null value with a renderable empty page', () => {
    const processed = processProviderReviewsResponse(envelope(null) as never)

    expect(processed.items).toEqual([])
    expect(processed.summary).toEqual({ average: 0, count: 0, distribution: [0, 0, 0, 0, 0] })
    expect(processed.viewer).toEqual({})
  })

  // A payload from a build that predates `viewer` must read as "this visitor may do
  // nothing" — the CTA hides rather than 401ing on submit.
  it('defaults a missing viewer to no permissions', () => {
    const withoutViewer = { ...page([review('a')]), viewer: undefined }

    expect(processProviderReviewsResponse(envelope(withoutViewer) as never).viewer).toEqual({})
  })

  it('keeps the viewer the API sent', () => {
    const served = page([], { viewer: { eligibleAppointmentId: 'appt-1', isProviderOwner: false } })

    expect(processProviderReviewsResponse(envelope(served)).viewer.eligibleAppointmentId).toBe('appt-1')
  })
})

describe('processReviewResponse', () => {
  it('unwraps the envelope', () => {
    const created = review('new', { isMine: true, comment: 'Lovely' })

    expect(processReviewResponse(envelope(created))).toEqual(created)
  })
})

describe('processReviewReportsResponse', () => {
  it('answers a null value with an empty queue', () => {
    expect(processReviewReportsResponse(envelope(null) as never)).toEqual({
      items: [],
      total: 0,
      page: 1,
      perPage: 0,
      pageCount: 1,
    })
  })
})

import { ROUTES } from '@constants/routes'

/**
 * The review list's paging lives in the URL, for the same reason Explore's filters do:
 * the section is a Server Component, so the query string is the only channel that
 * reaches it, and a shared link lands on the page the sender was reading.
 *
 * Named `reviewPage` rather than `page` so it cannot collide with a paging parameter
 * anything else on a provider page might one day want.
 */
export const REVIEWS_PAGE_PARAM = 'reviewPage'

/** A repeated key is a malformed URL, not two requests — take the first. */
const first = (raw: string | string[] | undefined): string => (Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? ''))

/** Anything that is not a positive integer degrades to page 1 rather than erroring. */
export const parseReviewsPage = (raw: Record<string, string | string[] | undefined>): number => {
  const parsed = Number.parseInt(first(raw[REVIEWS_PAGE_PARAM]), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

/**
 * Locale-free, as every `ROUTES` path is — `AppLink` adds the prefix.
 *
 * Built from the provider's **id**, never the route segment: this page also serves
 * `/providers/<slug>`, and paging off the segment would give one page two addresses.
 * Page 1 drops the parameter so the unpaged section has exactly one URL.
 *
 * The `#reviews` fragment is what makes paging usable at all — without it, following a
 * pager two thirds down a long profile lands the reader back at the top of the page.
 */
export const buildReviewsHref = (providerId: string, page: number): string => {
  const query = page > 1 ? `?${REVIEWS_PAGE_PARAM}=${page}` : ''
  return `${ROUTES.providers}/${providerId}${query}#reviews`
}

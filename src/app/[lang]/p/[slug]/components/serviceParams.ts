import { providerPagePath,ProviderPageRef } from '@helpers/entities'
import { BOOKING_SERVICES_ID } from './publicBookingCta'

/**
 * A service picked before arriving — from the service an Explore card names as the
 * search's match. In the URL rather than in state because the card is a Server Component
 * on another page: the query string is the only channel between the two.
 *
 * Named `service` and read once, on the server: `next/navigation` is gated off, so the
 * page reads it from `searchParams` and hands the booking column its first selection.
 */
export const SERVICE_PARAM = 'service'

/** A repeated key is a malformed URL, not two requests — take the first. */
const first = (raw: string | string[] | undefined): string => (Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? ''))

/**
 * The service to start with — only one this provider actually offers. Anything else (a
 * withdrawn service, another provider's id, a hand-edited value) is ignored, and the visit
 * then starts the way one with no `?service=` does.
 */
export const parseServiceParam = (
  raw: Record<string, string | string[] | undefined>,
  offeredIds: readonly string[]
): string | undefined => {
  const serviceId = first(raw[SERVICE_PARAM])
  return offeredIds.includes(serviceId) ? serviceId : undefined
}

/**
 * Which service the booking column starts on.
 *
 * A link that names one wins. Otherwise a catalogue of one starts on that service —
 * there is nothing else to choose — and a catalogue of several starts empty, so the
 * page does not prefer whichever row happens to be first.
 */
export const startingServiceId = (offeredIds: readonly string[], requestedId?: string): string | undefined => {
  if (requestedId) return requestedId
  const [only] = offeredIds
  return offeredIds.length === 1 ? only : undefined
}

/**
 * The provider's page (`providerPagePath`, `/p/<slug ?? id>`). The fragment lands on the
 * service list, where the chosen card shows selected and the calendar follows.
 */
export const buildServiceHref = (provider: ProviderPageRef, serviceId?: string): string => {
  const query = serviceId ? `?${SERVICE_PARAM}=${encodeURIComponent(serviceId)}` : ''
  return `${providerPagePath(provider)}${query}#${BOOKING_SERVICES_ID}`
}

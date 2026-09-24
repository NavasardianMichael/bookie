import { localeRedirect } from '@i18n/routeRedirect'
import { ROUTES } from '@constants/routes'

/**
 * What this page showed — the bookings a provider made as a client — is now the "Booked
 * by me" view of `/bookings`. That view is picked with a switch on the page rather than a
 * URL, so this lands on the page and the provider flips it.
 */
export const GET = localeRedirect(ROUTES.bookings)

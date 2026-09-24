import { localeRedirect } from '@i18n/routeRedirect'
import { ROUTES } from '@constants/routes'

/** The provider workspace's Bookings tab moved to its own page, `/bookings`. */
export const GET = localeRedirect(ROUTES.bookings)

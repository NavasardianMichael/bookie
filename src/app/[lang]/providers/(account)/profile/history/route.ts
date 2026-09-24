import { localeRedirect } from '@i18n/routeRedirect'
import { ROUTES } from '@constants/routes'

/**
 * History was renamed to Bookings, which then moved out of the settings shell to its own
 * page. Straight to `/bookings`, not via the old Bookings tab, so an old bookmark costs one
 * hop rather than two. See `localeRedirect` for why this is a Route Handler.
 */
export const GET = localeRedirect(ROUTES.bookings)

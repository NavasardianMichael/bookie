import { localeRedirect } from '@i18n/routeRedirect'
import { ROUTES } from '@constants/routes'

/** The consumer profile's Appointments tab moved to its own page, `/bookings`. */
export const GET = localeRedirect(ROUTES.bookings)

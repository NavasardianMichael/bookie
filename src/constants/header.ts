import { AppRouteName } from '@interfaces/routes'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { isPublicProviderPage } from '@helpers/routes'

/**
 * Nav destinations carry a **route name only**. The visible label is looked up by
 * that name in the `Nav` message namespace at render time — a constant module
 * cannot read the request locale, so a `label` field here would have pinned the
 * whole chrome to English.
 *
 * Every name below must have a matching key in `Nav`; `tests/unit/constants/header.spec.ts`
 * pins that.
 */
export const HEADER_ROUTES: AppRouteName[] = [
  ROUTE_KEYS.providers,
  ROUTE_KEYS.categories,
  ROUTE_KEYS.organizations,
]

/**
 * The signed-in account's own pages, appended to whatever `navRoutes` the route shows.
 *
 * Separate from `HEADER_ROUTES` because they follow the *session*, not the route: they
 * appear on the public provider page too, which drops the marketplace destinations but
 * keeps the avatar — and these belong with the avatar, not with the marketplace.
 * Both pages are guarded (`src/proxy.ts`), so offering them to a guest would only be a
 * detour through sign-in.
 */
export const HEADER_ACCOUNT_ROUTES: AppRouteName[] = [ROUTE_KEYS.bookings, ROUTE_KEYS.favorites]

/** Guest auth action in the header — registration is reached from the sign-in screen. */
export const HEADER_SIGN_IN: AppRouteName = ROUTE_KEYS.signIn

/**
 * Routes the overview page must not list.
 *
 * `/routes-overview` is described as a dev aid but it is prerendered and publicly
 * reachable, so anything named here is published. The admin pages are excluded for the
 * same reason `requireAdmin` answers 404 rather than 403: the admin surface should not
 * advertise that it exists. Guarding it is the API's job — this only stops us handing
 * out the address.
 */
const OVERVIEW_EXCLUDED: AppRouteName[] = [
  ROUTE_KEYS.adminReviews,
  ROUTE_KEYS.adminProviders,
  ROUTE_KEYS.billingCheckout,
  ROUTE_KEYS.billingReturn,
]

/** Dev aid only (`/routes-overview`), so these stay raw route names — not user copy. */
export const OVERVIEW_ROUTES: AppRouteName[] = (Object.keys(ROUTES) as AppRouteName[]).filter(
  (name) => !OVERVIEW_EXCLUDED.includes(name)
)

export type HeaderConfig = {
  showLogo: boolean
  showNav: boolean
  /** Destinations rendered in the header nav. Auth actions are separate. */
  navRoutes: AppRouteName[]
}

const DEFAULT_CONFIG: HeaderConfig = {
  showLogo: true,
  showNav: true,
  navRoutes: HEADER_ROUTES,
}

/** Public booking page: marketplace dests stay off; the logo is the way back. */
const PUBLIC_PROVIDER_NAV_ROUTES: AppRouteName[] = []

/**
 * Only the exceptions are listed; everything else falls back to DEFAULT_CONFIG.
 */
const HEADER_CONFIG_OVERRIDES: Partial<Record<AppRouteName, Partial<HeaderConfig>>> = {
  [ROUTE_KEYS.accountTypeSelection]: { showNav: false },
  // Full-bleed split with its own BrandLockup. A content-width header would sit the
  // mark between the two columns; hiding both logo and nav drops the bar entirely.
  [ROUTE_KEYS.consumerRegistration]: { showLogo: false, showNav: false },
  [ROUTE_KEYS.signIn]: { showNav: false },
  [ROUTE_KEYS.forgotPassword]: { showNav: false },
  [ROUTE_KEYS.resetPassword]: { showNav: false },
  [ROUTE_KEYS.verifyEmail]: { showNav: false },
  [ROUTE_KEYS.authCallback]: { showNav: false },
  [ROUTE_KEYS.completeRegistration]: { showNav: false },
  [ROUTE_KEYS.logout]: { showNav: false },
}

export const getHeaderConfig = (routeName?: AppRouteName, pathname?: string): HeaderConfig => {
  const config: HeaderConfig = {
    ...DEFAULT_CONFIG,
    ...(routeName ? HEADER_CONFIG_OVERRIDES[routeName] : undefined),
  }

  // Not an OVERRIDES entry: Providers list and the public page share the `providers`
  // route name, so the extra segment is what distinguishes them.
  if (pathname && isPublicProviderPage(pathname)) {
    return { ...config, navRoutes: PUBLIC_PROVIDER_NAV_ROUTES }
  }

  return config
}

/** The destinations to render: the route's own, then the account's when signed in. */
export const withAccountRoutes = (navRoutes: AppRouteName[], isSignedOn: boolean): AppRouteName[] =>
  isSignedOn ? [...navRoutes, ...HEADER_ACCOUNT_ROUTES] : navRoutes

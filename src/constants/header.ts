import { AppRouteName } from '@interfaces/routes'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'

/**
 * Nav destinations carry a **route name only**. The visible label is looked up by
 * that name in the `Nav` message namespace at render time — a constant module
 * cannot read the request locale, so a `label` field here would have pinned the
 * whole chrome to English.
 *
 * Every name below must have a matching key in `Nav`; `tests/unit/i18n` pins that.
 */
export const HEADER_ROUTES: AppRouteName[] = [
  ROUTE_KEYS.home,
  ROUTE_KEYS.providers,
  ROUTE_KEYS.categories,
  ROUTE_KEYS.organizations,
]

/**
 * Sign in and sign up are separate destinations: a returning user needs only a phone and
 * an OTP, while registration is role-specific and starts at the account-type chooser.
 */
export const HEADER_SIGN_IN: AppRouteName = ROUTE_KEYS.phoneNumberInput

/** Rendered as the header's primary call to action rather than a nav link. */
export const HEADER_CTA: AppRouteName = ROUTE_KEYS.accountTypeSelection

/** Dev aid only (`/routes-overview`), so these stay raw route names — not user copy. */
export const OVERVIEW_ROUTES: AppRouteName[] = Object.keys(ROUTES) as AppRouteName[]

/** Destinations with nothing meaningful to go "back" to. */
const TOP_LEVEL_ROUTE_NAMES = new Set<AppRouteName>([
  ROUTE_KEYS.home,
  ROUTE_KEYS.providers,
  ROUTE_KEYS.organizations,
  ROUTE_KEYS.categories,
  ROUTE_KEYS.contact,
  ROUTE_KEYS.routesOverview,
])

export type HeaderConfig = {
  showLogo: boolean
  showBack: boolean
  showNav: boolean
  /** Where to go when there is no history to pop, e.g. on a shared deep link. */
  backFallback: string
}

const DEFAULT_CONFIG: HeaderConfig = {
  showLogo: true,
  showBack: false,
  showNav: true,
  backFallback: ROUTES.home,
}

/**
 * Only the exceptions are listed; everything else falls back to DEFAULT_CONFIG,
 * with `showBack` derived from whether the route is a top-level destination.
 */
const HEADER_CONFIG_OVERRIDES: Partial<Record<AppRouteName, Partial<HeaderConfig>>> = {
  [ROUTE_KEYS.accountTypeSelection]: { showBack: false, showNav: false },
  // The consumer registration screen is a full-bleed split panel that carries its own
  // branding, so the header stays a bare back arrow over it.
  [ROUTE_KEYS.consumerRegistration]: { showNav: false, backFallback: ROUTES.accountTypeSelection },
  // The provider screen keeps the public nav, matching the prototype's marketing chrome.
  [ROUTE_KEYS.providerRegistration]: { backFallback: ROUTES.accountTypeSelection },
  [ROUTE_KEYS.phoneNumberInput]: { showNav: false, backFallback: ROUTES.accountTypeSelection },
  [ROUTE_KEYS.codeInput]: { showNav: false, backFallback: ROUTES.accountTypeSelection },
  [ROUTE_KEYS.profileCreated]: { showBack: false, showNav: false },
  [ROUTE_KEYS.logout]: { showNav: false },
  [ROUTE_KEYS.providerProfileCreation]: { showBack: false },
  [ROUTE_KEYS.providerServices]: { backFallback: ROUTES.providerProfile },
}

export const getHeaderConfig = (routeName?: AppRouteName): HeaderConfig => ({
  ...DEFAULT_CONFIG,
  showBack: !!routeName && !TOP_LEVEL_ROUTE_NAMES.has(routeName),
  ...(routeName ? HEADER_CONFIG_OVERRIDES[routeName] : undefined),
})

import { AppRouteName } from '@interfaces/routes'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'

type HeaderRoute = {
  name: AppRouteName
  label: string
}

/**
 * Nav destinations with real content. `contact` stays omitted until that page
 * holds something worth linking to.
 */
export const HEADER_ROUTES: HeaderRoute[] = [
  { name: ROUTE_KEYS.providers, label: 'Providers' },
  { name: ROUTE_KEYS.organizations, label: 'Organizations' },
  { name: ROUTE_KEYS.categories, label: 'Categories' },
]

/** Rendered as the header's primary call to action rather than a nav link. */
export const HEADER_CTA: HeaderRoute = { name: ROUTE_KEYS.accountTypeSelection, label: 'Sign on' }

export const OVERVIEW_ROUTES: HeaderRoute[] = Object.entries(ROUTES).map(([name]) => {
  return { name, label: name } as HeaderRoute
})

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
  [ROUTE_KEYS.phoneNumberInput]: { showNav: false, backFallback: ROUTES.accountTypeSelection },
  [ROUTE_KEYS.codeInput]: { showNav: false, backFallback: ROUTES.phoneNumberInput },
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

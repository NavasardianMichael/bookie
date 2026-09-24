import { ROUTES } from '@constants/routes'

/**
 * Which account tree a settings path belongs to, and where its counterpart lives.
 *
 * One `User` can hold both a Consumer and a Provider profile — booking anyone creates the
 * Consumer row (`resolveConsumerId` on the API) — but the session carries a single role,
 * resolved provider-first at login. So "switching workspace" is a **navigation**, not a
 * re-authentication: the same person opening the other half of their own account.
 *
 * The mapping is an explicit table rather than a string substitution on the path. The
 * consumer side has two tabs to the provider side's eight, and a rule like "swap the first
 * segment" would invent `/consumers/profile/analytics` — a URL that has never existed.
 *
 * Bookings are not in either tree any more. `/bookings` is one page for the whole account,
 * with its own switch between the two sides, so there is no pair of tabs left to map.
 */
export type WorkspaceRole = 'consumer' | 'provider'

/**
 * Provider tab → the consumer tab that answers the same question.
 *
 * Only genuine counterparts are listed. Everything absent from this table (analytics,
 * availability, SEO, approvals) has no consumer meaning at all and falls back to the
 * consumer home, which is what the caller asked for.
 *
 * `payments` deliberately points at the consumer *home*: consumer payment preferences were
 * merged into the Profile tab, and `/consumers/profile/payments` is only a redirect stub.
 * Sending the switch through a 307 would work and would also make the back button land on
 * a URL that immediately bounces again.
 */
const PROVIDER_TO_CONSUMER: Record<string, string> = {
  [ROUTES.providerProfile]: ROUTES.consumerProfile,
  [ROUTES.providerProfileNotifications]: ROUTES.consumerProfileNotifications,
  [ROUTES.providerProfilePayments]: ROUTES.consumerProfile,
  [ROUTES.providerServices]: ROUTES.consumerProfile,
}

/**
 * The reverse, built by hand rather than by inverting the table above — that one is
 * many-to-one (payments and services both land on the consumer home), so inverting it
 * would pick whichever key happened to be enumerated last.
 */
const CONSUMER_TO_PROVIDER: Record<string, string> = {
  [ROUTES.consumerProfile]: ROUTES.providerProfile,
  [ROUTES.consumerProfileNotifications]: ROUTES.providerProfileNotifications,
}

/** The home each side falls back to when the current tab has no counterpart. */
const HOME: Record<WorkspaceRole, string> = {
  consumer: ROUTES.consumerProfile,
  provider: ROUTES.providerProfile,
}

/**
 * Which tree a **locale-free** pathname sits in, or null if it is not a settings path.
 *
 * `providerServices` (`/providers/profile-services`) is checked before the profile
 * prefix: it is a provider settings tab living outside `/providers/profile`, and a bare
 * `startsWith(ROUTES.providerProfile)` would miss it.
 */
export const workspaceOf = (pathname: string): WorkspaceRole | null => {
  if (pathname === ROUTES.providerServices || pathname.startsWith(`${ROUTES.providerServices}/`)) return 'provider'
  if (pathname === ROUTES.providerProfile || pathname.startsWith(`${ROUTES.providerProfile}/`)) return 'provider'
  if (pathname === ROUTES.consumerProfile || pathname.startsWith(`${ROUTES.consumerProfile}/`)) return 'consumer'
  return null
}

/**
 * Where the workspace switch should send someone standing on `pathname`.
 *
 * Exact match only. A deeper path under a mapped tab (none exist today) resolves to the
 * target home rather than being rewritten, because guessing at a URL that may not exist
 * is how a switch becomes a 404.
 */
export const counterpartPath = (pathname: string, target: WorkspaceRole): string => {
  const table = target === 'consumer' ? PROVIDER_TO_CONSUMER : CONSUMER_TO_PROVIDER
  return table[pathname] ?? HOME[target]
}

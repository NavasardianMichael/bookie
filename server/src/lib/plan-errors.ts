/**
 * Stable application codes for a provider-side write their plan does not cover.
 *
 * Carried in the envelope's `code`, the way `AUTH_ERROR` and `BOOKING_ERROR` are, because the
 * client reacts rather than merely displays: it names the limit and points at the Plan tab
 * instead of showing a generic 403. Mirrored as `PLAN_ERROR_CODES` in `src/constants/plans.ts`.
 *
 * This module imports nothing, deliberately — the same reason as `lib/booking-errors.ts`:
 * `tests/unit/server/planErrors.spec.ts` imports it beside the web constant it has to equal.
 *
 * - `serviceLimit` — one more active service than the plan allows (create, or reactivate).
 * - `featureLocked` — a feature the plan does not include (today: changing the vanity slug).
 * - `photoImportLimit` — today's photo imports are spent (`Entitlements.photoImportsPerDay`).
 *   Its own code rather than `featureLocked`, because the feature *is* included: the
 *   client says when it comes back as well as what an upgrade would change.
 * - `profileAssistantLimit` — today's profile-assistant runs are spent
 *   (`Entitlements.profileAssistantRunsPerDay`). Its own code for the reason `photoImportLimit` has one.
 * - `bookingLimit` — bookings the provider enters themselves would pass the monthly
 *   allowance. The provider-side twin of `BOOKING_ERROR.bookingFull`, which is worded for a
 *   visitor and must not mention a plan.
 *
 * A booking refused because a provider's monthly allowance is spent is **not** here. That
 * refusal reaches a visitor, never the provider, and is `BOOKING_ERROR.bookingFull`: the
 * visitor must not be told about a plan they do not pay for.
 */
export const PLAN_ERROR = {
  serviceLimit: 4101,
  featureLocked: 4102,
  photoImportLimit: 4103,
  bookingLimit: 4104,
  profileAssistantLimit: 4105,
} as const

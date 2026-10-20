import dayjs, { Dayjs } from 'dayjs'
import { Addon, AddonSource, Plan, ProviderAddon, ProviderPlanWithUsage } from '@interfaces/plans'
import { BILLING_STATUSES } from '@constants/billing'
import { ADDON_SOURCES } from '@constants/plans'

/**
 * A plan's expiry is an instant — the first moment it no longer applies — but people think
 * in its **last day**. The admin picks the last day, and the plan ends at the UTC midnight
 * after it; the Plan tab reads it back the same way. UTC on both sides, because that is
 * the zone the server counts the booking month in (it does not read `Provider.timeZone` —
 * docs/BACKLOG.md), so the two can never disagree about which day a plan ended on.
 */

/** The last day picked in a date picker → the instant the plan ends (the next UTC midnight). */
export const toPlanExpiryISO = (lastDay: Dayjs): string =>
  new Date(Date.UTC(lastDay.year(), lastDay.month(), lastDay.date() + 1)).toISOString()

/**
 * An expiry instant → its last covered day, as a `Date` to format with `timeZone: 'UTC'`.
 * One millisecond before the end is still inside the last day in UTC.
 */
export const toPlanLastDay = (expiresAtISO: string): Date => new Date(Date.parse(expiresAtISO) - 1)

/** The same last day as a local-midnight `Dayjs`, which is what antd's `DatePicker` shows. */
export const toPlanLastDayValue = (expiresAtISO: string): Dayjs => {
  const lastDay = toPlanLastDay(expiresAtISO)
  return dayjs(new Date(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()))
}

/**
 * How much of a limit is used, as a whole percentage for a progress bar — capped at 100,
 * since a downgraded provider can sit above their new limit. `null` when unlimited: there
 * is no bar to draw against infinity.
 */
export const usagePercent = (used: number, limit: number | null): number | null => {
  if (limit === null) return null
  if (limit <= 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

/** Room for one more under `limit` (`null` is unlimited) — the client twin of the API's `hasRoomFor`. */
export const hasRoomFor = (used: number, limit: number | null): boolean => limit === null || used < limit

/**
 * How many of an add-on the provider holds right now, from one source or all. Packs from
 * both sources add up, a feature held twice is still one — the API's `heldAddons`, for the
 * list `GET /provider-profile/plan` sends.
 */
export const heldQuantity = (addons: readonly ProviderAddon[], addon: Addon, source?: AddonSource): number =>
  addons
    .filter((held) => held.addon === addon && (!source || held.source === source))
    .reduce((total, held) => total + held.quantity, 0)

/**
 * What a billing change is waiting on, before the webhook lands it:
 *
 * - `plan` — that plan is the one in force (a switch);
 * - `addon` — exactly `quantity` of it is paid for, 0 being none (an add-on change);
 * - `subscribed` — a subscription is live at all. What a checkout waits on, because Paddle's
 *   overlay lets the buyer change quantities or remove items, so the exact cart is not known.
 */
export type BillingTarget =
  | { kind: 'plan'; plan: Plan }
  | { kind: 'addon'; addon: Addon; quantity: number }
  | { kind: 'subscribed' }

export const isBillingTargetReached = (target: BillingTarget, current: ProviderPlanWithUsage): boolean => {
  if (target.kind === 'plan') return current.effectivePlan === target.plan
  if (target.kind === 'addon') return heldQuantity(current.addons, target.addon, ADDON_SOURCES.paddle) === target.quantity
  return current.billing !== null && current.billing.status !== BILLING_STATUSES.canceled
}

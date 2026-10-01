import type { Plan, Prisma } from '@prisma/client'
import { PLAN_ERROR } from '../lib/plan-errors.js'
import { HttpError } from '../middleware/error.js'

/**
 * Plans and what each one allows — the single source of truth for every limit in the app.
 *
 * Pure, like `providerSeo.ts`: no Prisma client, no clock of its own (every function that
 * depends on the time takes `now`), so `tests/unit/server/plans.spec.ts` reaches all of it.
 * The queries that feed it live in `planUsage.ts`. **Nothing reads `Provider.plan` to gate
 * a feature except through `getEntitlements`** — that is what keeps an expiry, a later
 * Paddle subscription, and a limit change each a one-place edit. See docs/BILLING.md.
 *
 * Only providers are ever billed. Nothing here may gate something a consumer does:
 * booking, reviewing, favouriting and reading a public page stay free for good. A spent
 * booking allowance closes a provider's *online* calendar, and the visitor is told only to
 * contact the provider (`BOOKING_ERROR.bookingFull`), never why.
 */

/** Cheapest first. The web's `PLANS` must list the same values (pinned by `planErrors.spec.ts`). */
export const PLAN_ORDER = ['free', 'basic', 'standard', 'premium'] as const satisfies readonly Plan[]

/** `null` is unlimited throughout — JSON has no `Infinity`, and `0` would read as "none". */
export type Entitlements = {
  /** Services with `active: true`. Inactive ones never count, so deactivating frees a slot. */
  maxActiveServices: number | null
  /** Non-cancelled bookings **created** in the current UTC calendar month. */
  maxBookingsPerMonth: number | null
  /** How far back the analytics tab may look, measured from now. */
  analyticsHistoryDays: number | null
  /** May set or change the vanity `/p/<slug>`. Without it the page keeps its id URL. */
  customSlug: boolean
}

/**
 * The limits are placeholders to be tuned, and this is the only place they live. Each one
 * must be non-decreasing along `PLAN_ORDER` — an upgrade that takes something away is a
 * bug, and `plans.spec.ts` fails on it.
 */
export const PLAN_CATALOGUE: Readonly<Record<Plan, Entitlements>> = {
  free: { maxActiveServices: 3, maxBookingsPerMonth: 50, analyticsHistoryDays: 30, customSlug: false },
  basic: { maxActiveServices: 10, maxBookingsPerMonth: 300, analyticsHistoryDays: 365, customSlug: true },
  standard: { maxActiveServices: 30, maxBookingsPerMonth: null, analyticsHistoryDays: null, customSlug: true },
  premium: { maxActiveServices: null, maxBookingsPerMonth: null, analyticsHistoryDays: null, customSlug: true },
}

export type PlanFields = { plan: Plan; planExpiresAt: Date | null }

/**
 * The plan in force right now: the stored one, or `free` once a paid plan's expiry has
 * passed. Computed on read rather than written back by a job — this API has no scheduler
 * and must stay one process — so an expiry takes effect on the very next request, with no
 * window where a lapsed plan still grants anything.
 */
export const effectivePlan = (provider: PlanFields, now: Date): Plan =>
  provider.plan !== 'free' && provider.planExpiresAt !== null && provider.planExpiresAt <= now ? 'free' : provider.plan

export const getEntitlements = (provider: PlanFields, now: Date): Entitlements =>
  PLAN_CATALOGUE[effectivePlan(provider, now)]

/** Room for one more under `limit`, `null` being unlimited. */
export const hasRoomFor = (used: number, limit: number | null): boolean => limit === null || used < limit

/**
 * The window the monthly booking allowance counts over: the current **UTC** calendar month,
 * `[start, end)`. UTC because `Provider` has no timezone column; a provider east of
 * Greenwich sees their allowance reset a few hours into their own 1st (docs/BACKLOG.md).
 */
export const bookingPeriod = (now: Date): { start: Date; end: Date } => ({
  start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
})

/**
 * The bookings that spend a provider's monthly allowance: created this month and not
 * cancelled. By creation time, not appointment time — the allowance meters bookings
 * *taken*, so one made in September for November counts in September. A cancelled or
 * declined booking gives its place back, so a client cancelling does not cost the provider.
 */
export const bookingsThisMonthWhere = (providerId: string, now: Date): Prisma.AppointmentWhereInput => {
  const { start, end } = bookingPeriod(now)
  return { providerId, status: { not: 'cancelled' }, createdAt: { gte: start, lt: end } }
}

/**
 * Whether a service write puts one more service on the public page. Only an
 * inactive → active move takes a slot, so re-saving an already live service is never
 * blocked — which is also what keeps a downgraded provider's over-cap services editable.
 */
export const takesServiceSlot = (wasActive: boolean, willBeActive: boolean): boolean => willBeActive && !wasActive

export const assertServiceSlot = (activeServices: number, entitlements: Entitlements): void => {
  if (hasRoomFor(activeServices, entitlements.maxActiveServices)) return
  throw new HttpError(
    403,
    `Your plan allows ${entitlements.maxActiveServices} active services. Deactivate one or upgrade to add another.`,
    PLAN_ERROR.serviceLimit
  )
}

/**
 * Whether a slug write needs `customSlug`.
 *
 * - **Unchanged** never does. The SEO tab resends the slug with every save, and a free
 *   provider's grandfathered slug — set before slugs were paid — must survive them saving
 *   a title.
 * - **Cleared** never does: giving up a vanity address is always allowed.
 * - **Set or changed** does.
 *
 * `next` is `parseProviderSeoBody`'s output: a validated, lowercased slug or `null`.
 */
export const needsCustomSlug = (current: string | null, next: string | null): boolean =>
  next !== null && next !== current

export const assertSlugChange = (current: string | null, next: string | null, entitlements: Entitlements): void => {
  if (!needsCustomSlug(current, next) || entitlements.customSlug) return
  throw new HttpError(403, 'A custom link is not included in your plan', PLAN_ERROR.featureLocked)
}

export type CapNotice = 'warned' | 'reached'

/** The warning goes out at 80% of the allowance, rounded up so it is never below one booking. */
export const capWarningThreshold = (limit: number): number => Math.ceil(limit * 0.8)

const sentSince = (stamp: Date | null, periodStart: Date): boolean => stamp !== null && stamp >= periodStart

/**
 * Which allowance emails are due now, each at most once per month.
 *
 * `used` counts the booking just made, or — on a refused booking — what was already there.
 * When the limit is reached only `reached` is returned, even if the 80% warning never went
 * out (a limit of 1, or a trial that expired mid-month): two emails in one moment would
 * say the same thing twice. The caller stamps the warning along with it, so a later
 * cancellation that dips back under the limit cannot then send a stray 80%.
 */
export const capNoticesDue = (input: {
  used: number
  limit: number | null
  warnedAt: Date | null
  reachedAt: Date | null
  periodStart: Date
}): CapNotice[] => {
  const { used, limit, warnedAt, reachedAt, periodStart } = input
  if (limit === null) return []
  if (used >= limit) return sentSince(reachedAt, periodStart) ? [] : ['reached']
  if (used >= capWarningThreshold(limit) && !sentSince(warnedAt, periodStart)) return ['warned']
  return []
}

const isPlan = (value: unknown): value is Plan => PLAN_ORDER.includes(value as Plan)

/**
 * `PATCH /admin/providers/:id/plan`. `planExpiresAt` is an ISO instant in the future, or
 * `null` / absent for no end. It is dropped for `free`, which has nothing to lapse from —
 * a stored expiry there would only resurface if the plan were later raised by hand.
 */
export const parseAdminPlanBody = (body: unknown, now: Date): PlanFields => {
  const source = (body ?? {}) as Record<string, unknown>

  if (!isPlan(source.plan)) {
    throw new HttpError(400, `plan must be one of: ${PLAN_ORDER.join(', ')}`, 400)
  }

  const raw = source.planExpiresAt
  if (raw === undefined || raw === null || raw === '' || source.plan === 'free') {
    return { plan: source.plan, planExpiresAt: null }
  }

  const planExpiresAt = typeof raw === 'string' ? new Date(raw) : new Date(NaN)
  if (Number.isNaN(planExpiresAt.getTime())) {
    throw new HttpError(400, 'planExpiresAt must be an ISO timestamp', 400)
  }
  if (planExpiresAt <= now) {
    throw new HttpError(400, 'planExpiresAt must be in the future', 400)
  }

  return { plan: source.plan, planExpiresAt }
}

import type { Addon, AddonSource, Plan, Prisma } from '@prisma/client'
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
  /** May set or change the custom `/p/<slug>`. Without it the page stays at `/p/<id>`. */
  customSlug: boolean
  /**
   * The provider's own notices also reach their linked Telegram. Email is never gated, and
   * neither is a *client's* Telegram — clients never pay (docs/NOTIFICATIONS.md).
   */
  telegramNotifications: boolean
  /** A private iCal feed of the provider's bookings (`GET /calendar/:providerId/:token`). */
  calendarFeed: boolean
  /** The public page drops its "Booking page by Bookie" line. */
  removeBranding: boolean
  /**
   * Photos of handwritten bookings read per UTC day (`photoImportPeriod`). Metered because
   * every read spends the deployment's one shared Gemini quota, not because the feature is a
   * paid one: Free gets a taste, paid plans are bounded only by the per-provider throttle in
   * `routes/bookingImport.ts`.
   */
  photoImportsPerDay: number | null
}

/**
 * The limits are placeholders to be tuned, and this is the only place they live. Each one
 * must be non-decreasing along `PLAN_ORDER` — an upgrade that takes something away is a
 * bug, and `plans.spec.ts` fails on it.
 *
 * Paid plans sell capacity and convenience, never the basics: every plan, Free included,
 * gets every email (new booking, changes, reminders for the provider and their clients).
 */
const PAID_CONVENIENCE = { telegramNotifications: true, calendarFeed: true, removeBranding: true } as const

export const PLAN_CATALOGUE: Readonly<Record<Plan, Entitlements>> = {
  free: {
    maxActiveServices: 3,
    maxBookingsPerMonth: 50,
    analyticsHistoryDays: 30,
    customSlug: false,
    telegramNotifications: false,
    calendarFeed: false,
    removeBranding: false,
    photoImportsPerDay: 1,
  },
  basic: {
    maxActiveServices: 10,
    maxBookingsPerMonth: 300,
    analyticsHistoryDays: 365,
    customSlug: true,
    photoImportsPerDay: null,
    ...PAID_CONVENIENCE,
  },
  standard: {
    maxActiveServices: 30,
    maxBookingsPerMonth: null,
    analyticsHistoryDays: null,
    customSlug: true,
    photoImportsPerDay: null,
    ...PAID_CONVENIENCE,
  },
  premium: {
    maxActiveServices: null,
    maxBookingsPerMonth: null,
    analyticsHistoryDays: null,
    customSlug: true,
    photoImportsPerDay: null,
    ...PAID_CONVENIENCE,
  },
}

/**
 * What each plan costs, in USD cents, billed monthly. The **display fallback** only: what a
 * provider is charged is the Paddle price behind `PADDLE_PRICE_ID_<PLAN>`, which Paddle may
 * also localize (`GET /billing/prices`). Change a price in both places together —
 * `docs/PADDLE_SETUP.md`. Cents, because a float `4.99` is not `4.99`.
 */
export type PlanPrice = { amountCents: number; currency: 'USD'; interval: 'month' }

export const PLAN_PRICES: Readonly<Record<Plan, PlanPrice>> = {
  free: { amountCents: 0, currency: 'USD', interval: 'month' },
  basic: { amountCents: 499, currency: 'USD', interval: 'month' },
  standard: { amountCents: 1499, currency: 'USD', interval: 'month' },
  premium: { amountCents: 2499, currency: 'USD', interval: 'month' },
}

/** The plans that can be bought — every one but `free`. */
export type PaidPlan = Exclude<Plan, 'free'>

export const PAID_PLANS = PLAN_ORDER.filter((plan): plan is PaidPlan => plan !== 'free')

export const isPaidPlan = (value: unknown): value is PaidPlan => PAID_PLANS.includes(value as PaidPlan)

export type PlanFields = { plan: Plan; planExpiresAt: Date | null }

/**
 * The plan in force right now: the stored one, or `free` once a paid plan's expiry has
 * passed. Computed on read rather than swept by a job — the reminder sender is the API's only
 * job, and an expiry needs none — so it takes effect on the very next request, with no window
 * where a lapsed plan still grants anything.
 */
export const effectivePlan = (provider: PlanFields, now: Date): Plan =>
  provider.plan !== 'free' && provider.planExpiresAt !== null && provider.planExpiresAt <= now ? 'free' : provider.plan

/**
 * Add-ons — one feature, or a pack of capacity, sold monthly on its own on top of any plan,
 * Free included (docs/BILLING.md → *Add-ons*). The plans stay the bundles: each costs less
 * than the add-ons it would take to rebuild it from Free, and `plans.spec.ts` fails otherwise.
 *
 * A feature add-on turns on the entitlement it is named after. A pack adds `step` to a limit
 * per unit; an unlimited limit stays unlimited, which is also what makes a pack pointless on
 * a plan that has none (`isAddonIncluded`). The web's `ADDON_ORDER` must list the same values.
 */
export const ADDON_ORDER = [
  'customSlug',
  'telegramNotifications',
  'calendarFeed',
  'removeBranding',
  'extraServices',
  'extraBookings',
] as const satisfies readonly Addon[]

/** The on/off entitlements an add-on can sell. */
export type FeatureKey = 'customSlug' | 'telegramNotifications' | 'calendarFeed' | 'removeBranding'
/** The limits a pack can raise. */
export type CapacityKey = 'maxActiveServices' | 'maxBookingsPerMonth'

export type AddonSpec =
  | { kind: 'feature'; grants: FeatureKey }
  | { kind: 'capacity'; limit: CapacityKey; step: number; maxQuantity: number }

export const ADDON_CATALOGUE: Readonly<Record<Addon, AddonSpec>> = {
  customSlug: { kind: 'feature', grants: 'customSlug' },
  telegramNotifications: { kind: 'feature', grants: 'telegramNotifications' },
  calendarFeed: { kind: 'feature', grants: 'calendarFeed' },
  removeBranding: { kind: 'feature', grants: 'removeBranding' },
  extraServices: { kind: 'capacity', limit: 'maxActiveServices', step: 5, maxQuantity: 10 },
  extraBookings: { kind: 'capacity', limit: 'maxBookingsPerMonth', step: 100, maxQuantity: 10 },
}

/**
 * Each add-on's monthly USD price, per unit — the same display-fallback role as `PLAN_PRICES`:
 * what is charged is the Paddle price behind `PADDLE_PRICE_ID_ADDON_<NAME>`. Placeholders,
 * set so one or two add-ons cost less than Basic and a third does not; below about $2 Paddle's
 * per-transaction fee (5% + 50¢) takes a third or more of a lone add-on.
 */
export const ADDON_PRICES: Readonly<Record<Addon, PlanPrice>> = {
  customSlug: { amountCents: 199, currency: 'USD', interval: 'month' },
  telegramNotifications: { amountCents: 199, currency: 'USD', interval: 'month' },
  calendarFeed: { amountCents: 199, currency: 'USD', interval: 'month' },
  removeBranding: { amountCents: 299, currency: 'USD', interval: 'month' },
  extraServices: { amountCents: 199, currency: 'USD', interval: 'month' },
  extraBookings: { amountCents: 199, currency: 'USD', interval: 'month' },
}

export const isAddon = (value: unknown): value is Addon => ADDON_ORDER.includes(value as Addon)

/** How many of one add-on a provider can hold: one of a feature, up to `maxQuantity` packs. */
export const maxAddonQuantity = (addon: Addon): number => {
  const spec = ADDON_CATALOGUE[addon]
  return spec.kind === 'feature' ? 1 : spec.maxQuantity
}

/** One add-on and how many of it — a cart line, or what a subscription holds. */
export type AddonLine = { addon: Addon; quantity: number }

/** One `ProviderAddon` row, as `getEntitlements` reads it. */
export type AddonGrant = AddonLine & { source: AddonSource; expiresAt: Date | null }

/**
 * Everything `getEntitlements` reads. `addons` is required, not optional, so a select that
 * forgets it fails to typecheck instead of silently ignoring what a provider paid for —
 * select `ENTITLEMENT_SELECT` wherever a plan is about to be enforced.
 */
export type EntitlementFields = PlanFields & { addons: readonly AddonGrant[] }

export const ADDON_GRANT_SELECT = {
  addon: true,
  source: true,
  quantity: true,
  expiresAt: true,
} as const satisfies Prisma.ProviderAddonSelect

export const ENTITLEMENT_SELECT = {
  plan: true,
  planExpiresAt: true,
  addons: { select: ADDON_GRANT_SELECT },
} as const satisfies Prisma.ProviderSelect

/** A row in force: no end, or an end still ahead — the exclusive boundary `effectivePlan` uses. */
export const isGrantLive = (grant: Pick<AddonGrant, 'expiresAt'>, now: Date): boolean =>
  grant.expiresAt === null || grant.expiresAt > now

/**
 * The add-ons in force and how many of each, merged across sources — a feature granted twice
 * is still one, packs add up — and clamped to `maxAddonQuantity`, so a Paddle price left at its
 * default maximum of 100 cannot sell more than the catalogue offers. `source` narrows to one
 * writer's rows: what the provider *pays* for is the `paddle` rows alone.
 */
export const heldAddons = (grants: readonly AddonGrant[], now: Date, source?: AddonSource): Map<Addon, number> => {
  const held = new Map<Addon, number>()
  for (const grant of grants) {
    if (grant.quantity < 1 || !isGrantLive(grant, now) || (source && grant.source !== source)) continue
    held.set(grant.addon, Math.min((held.get(grant.addon) ?? 0) + grant.quantity, maxAddonQuantity(grant.addon)))
  }
  return held
}

/** A plan's entitlements with add-ons on top. Never mutates `base`, which is shared. */
export const applyAddons = (base: Entitlements, held: ReadonlyMap<Addon, number>): Entitlements => {
  const merged: Entitlements = { ...base }
  for (const [addon, quantity] of held) {
    const spec = ADDON_CATALOGUE[addon]
    if (spec.kind === 'feature') {
      merged[spec.grants] = true
    } else {
      const limit = merged[spec.limit]
      merged[spec.limit] = limit === null ? null : limit + spec.step * quantity
    }
  }
  return merged
}

/**
 * What a provider may do right now: the effective plan, plus every live add-on. With none it
 * is the shared catalogue entry itself — no allocation on the common path.
 */
export const getEntitlements = (provider: EntitlementFields, now: Date): Entitlements => {
  const base = PLAN_CATALOGUE[effectivePlan(provider, now)]
  const held = heldAddons(provider.addons, now)
  return held.size === 0 ? base : applyAddons(base, held)
}

/**
 * Whether a plan already grants what an add-on sells — the feature itself, or an unlimited
 * limit a pack cannot raise. Such an add-on is not sold on that plan, and a switch to it
 * drops the add-on, so nobody pays twice.
 */
export const isAddonIncluded = (plan: Plan, addon: Addon): boolean => {
  const spec = ADDON_CATALOGUE[addon]
  const entitlements = PLAN_CATALOGUE[plan]
  return spec.kind === 'feature' ? entitlements[spec.grants] : entitlements[spec.limit] === null
}

/** Every plan that already includes an add-on — what `GET /plans/addons` publishes. */
export const plansIncluding = (addon: Addon): Plan[] => PLAN_ORDER.filter((plan) => isAddonIncluded(plan, addon))

/** The monthly USD list price of a set of add-ons, in cents. */
export const addonsMonthlyCents = (held: ReadonlyMap<Addon, number>): number =>
  [...held].reduce((total, [addon, quantity]) => total + ADDON_PRICES[addon].amountCents * quantity, 0)

/**
 * A bigger plan that would cost the provider less than their plan plus the add-ons they pay
 * for — the Plan tab's "Basic includes all of this" hint. Priced the way a switch would leave
 * them: the add-ons that plan includes are dropped and the rest kept, exactly as
 * `services/billing.ts#itemsForPlan` does, so nothing they hold is lost. The cheapest such
 * plan, or null. In USD list prices: a country override in Paddle can disagree, which is
 * acceptable for a hint.
 */
export const betterPlanFor = (plan: Plan, held: ReadonlyMap<Addon, number>): PaidPlan | null => {
  let best: { plan: PaidPlan; cents: number } | null = null
  const current = PLAN_PRICES[plan].amountCents + addonsMonthlyCents(held)

  for (const candidate of PAID_PLANS) {
    if (PLAN_ORDER.indexOf(candidate) <= PLAN_ORDER.indexOf(plan)) continue
    const kept = new Map([...held].filter(([addon]) => !isAddonIncluded(candidate, addon)))
    const cents = PLAN_PRICES[candidate].amountCents + addonsMonthlyCents(kept)
    if (cents < current && (!best || cents < best.cents)) best = { plan: candidate, cents }
  }

  return best?.plan ?? null
}

/**
 * Add-on lines from a request body: each a known add-on, at most once, with a whole quantity
 * from 1 to its maximum. Shared by checkout and the admin grant, which must agree on what a
 * valid line is.
 */
export const parseAddonLines = (raw: unknown): AddonLine[] => {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) throw new HttpError(400, 'addons must be a list', 400)

  const lines: AddonLine[] = []
  for (const entry of raw) {
    const source = (entry ?? {}) as Record<string, unknown>
    if (!isAddon(source.addon)) throw new HttpError(400, `addon must be one of: ${ADDON_ORDER.join(', ')}`, 400)
    const quantity = source.quantity ?? 1
    const max = maxAddonQuantity(source.addon)
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > max) {
      throw new HttpError(400, `quantity for ${source.addon} must be a whole number from 1 to ${max}`, 400)
    }
    if (lines.some((line) => line.addon === source.addon)) {
      throw new HttpError(400, `${source.addon} is listed twice`, 400)
    }
    lines.push({ addon: source.addon, quantity })
  }
  return lines
}

/** Room for one more under `limit`, `null` being unlimited. */
export const hasRoomFor = (used: number, limit: number | null): boolean => limit === null || used < limit

/**
 * The window the monthly booking allowance counts over: the current **UTC** calendar month,
 * `[start, end)`. UTC: the allowance does not read `Provider.timeZone` yet, so a provider
 * east of Greenwich sees it reset a few hours into their own 1st (docs/BACKLOG.md).
 */
export const bookingPeriod = (now: Date): { start: Date; end: Date } => ({
  start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
})

/**
 * The window `photoImportsPerDay` counts over: the current **UTC** day, `[start, end)` — the
 * allowance's UTC caveat, for the same reason (docs/BACKLOG.md).
 */
export const photoImportPeriod = (now: Date): { start: Date; end: Date } => ({
  start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)),
})

/**
 * Refuses a photo import past today's allowance. The message names when it comes back; the
 * client words it from the code and links the Plan tab.
 */
export const assertPhotoImport = (usedToday: number, entitlements: Entitlements): void => {
  if (hasRoomFor(usedToday, entitlements.photoImportsPerDay)) return
  throw new HttpError(
    403,
    `Your plan includes ${entitlements.photoImportsPerDay} photo import a day. It resets at midnight UTC.`,
    PLAN_ERROR.photoImportLimit
  )
}

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

/**
 * The allowance-notice stamps to clear when a write changes the **effective booking
 * allowance**, so the new limit's thresholds can notify again. The allowance, not the plan: a
 * pack of bookings raises it with no plan change at all. Re-saving the same thing clears
 * nothing, or a provider would be told twice in a month that they are nearly full. Shared by
 * the admin routes and the Paddle webhook — the writers of `plan` and of add-ons.
 */
export const planChangeStampReset = (
  current: EntitlementFields,
  next: EntitlementFields,
  now: Date
): { bookingCapWarnedAt: null; bookingCapReachedAt: null } | Record<string, never> =>
  getEntitlements(current, now).maxBookingsPerMonth !== getEntitlements(next, now).maxBookingsPerMonth
    ? { bookingCapWarnedAt: null, bookingCapReachedAt: null }
    : {}

export const isPlan = (value: unknown): value is Plan => PLAN_ORDER.includes(value as Plan)

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

/**
 * `PATCH /admin/providers/:id/addons`: the complete set of add-ons an admin grants, which
 * replaces their previous grant (`[]` withdraws it), and one last instant for all of them —
 * an ISO instant in the future, or `null` / absent for no end. Paddle's rows are untouched.
 */
export const parseAdminAddonsBody = (body: unknown, now: Date): { addons: AddonLine[]; expiresAt: Date | null } => {
  const source = (body ?? {}) as Record<string, unknown>
  if (!Array.isArray(source.addons)) throw new HttpError(400, 'addons must be a list', 400)
  const addons = parseAddonLines(source.addons)

  const raw = source.expiresAt
  if (raw === undefined || raw === null || raw === '' || addons.length === 0) return { addons, expiresAt: null }

  const expiresAt = typeof raw === 'string' ? new Date(raw) : new Date(NaN)
  if (Number.isNaN(expiresAt.getTime())) throw new HttpError(400, 'expiresAt must be an ISO timestamp', 400)
  if (expiresAt <= now) throw new HttpError(400, 'expiresAt must be in the future', 400)

  return { addons, expiresAt }
}

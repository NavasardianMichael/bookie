import { BILLING_STATUSES } from '@constants/billing'
import { ADDON_SOURCES, ADDONS, PLANS } from '@constants/plans'

export type Plan = (typeof PLANS)[keyof typeof PLANS]

export type Addon = (typeof ADDONS)[keyof typeof ADDONS]

export type AddonSource = (typeof ADDON_SOURCES)[keyof typeof ADDON_SOURCES]

/**
 * What a plan allows, exactly as the API's `services/plans.ts` declares it. `null` is
 * unlimited throughout — JSON has no `Infinity`, and `0` would read as "none".
 */
export type Entitlements = {
  /** Services with `active: true`; inactive ones never count. */
  maxActiveServices: number | null
  /** Non-cancelled bookings created in the current UTC calendar month. */
  maxBookingsPerMonth: number | null
  /** How far back analytics may look, from now. */
  analyticsHistoryDays: number | null
  /** May set or change the vanity `/p/<slug>`. */
  customSlug: boolean
  /** The provider's own notices also reach their linked Telegram. */
  telegramNotifications: boolean
  /** A private iCal feed of the provider's bookings. */
  calendarFeed: boolean
  /** The public page drops its "Booking page by Bookie" line. */
  removeBranding: boolean
  /** Photos of handwritten bookings read per UTC day ("Add from photo" on `/bookings`). */
  photoImportsPerDay: number | null
}

/** The USD display price of a plan, in cents, billed monthly. Free is `0`. */
export type PlanPrice = {
  amountCents: number
  currency: 'USD'
  interval: 'month'
}

/**
 * One row of `GET /plans`, cheapest first. `price` is the USD fallback; the visitor's
 * localized total comes from `GET /billing/prices`. `purchasable` is whether this deployment
 * sells the plan through Paddle — when not, a paid plan is requested through the contact form.
 */
export type PlanCatalogueEntry = {
  id: Plan
  entitlements: Entitlements
  price: PlanPrice
  purchasable: boolean
}

/** A plan that can be bought — every one but Free. */
export type PaidPlan = Exclude<Plan, typeof PLANS.free>

/**
 * One row of `GET /plans/addons`, in catalogue order. A `feature` turns on the entitlement it
 * is named after; a `capacity` pack adds `step` to its limit per unit, up to `maxQuantity`.
 * `includedIn` lists the plans that already grant it — it is not sold on those, and a switch
 * to one drops it. `price` is per unit, USD; `purchasable` means what it does on a plan.
 */
export type AddonCatalogueEntry = {
  id: Addon
  kind: 'feature' | 'capacity'
  step: number | null
  maxQuantity: number
  price: PlanPrice
  purchasable: boolean
  includedIn: Plan[]
}

/** One add-on and how many of it — a cart line. */
export type AddonLine = { addon: Addon; quantity: number }

/** An add-on a provider holds right now, one per source. */
export type ProviderAddon = AddonLine & {
  source: AddonSource
  /** ISO instant it lapses; absent means no end. */
  expiresAt?: string
}

export type BillingStatus = (typeof BILLING_STATUSES)[keyof typeof BILLING_STATUSES]

/**
 * The provider's Paddle subscription, on `GET /provider-profile/plan`. `null` for a
 * provider who never subscribed (an admin-assigned plan has no billing). `manageable` is
 * whether the billing portal can be opened.
 */
export type ProviderBilling = {
  status: BillingStatus
  /** ISO instant: the current period's end — the next renewal while active. */
  periodEndsAt?: string
  /** ISO instant: set while a cancellation is scheduled; the plan runs until then. */
  cancelsAt?: string
  manageable: boolean
}

/**
 * A provider's plan as its owner sees it. `plan` is what was assigned; `effectivePlan` is
 * what applies now, which is `free` once `planExpiresAt` has passed. `entitlements` are
 * the effective plan's with every live add-on on top, so the client never re-derives them;
 * `addons` lists those add-ons.
 */
export type ProviderPlan = {
  plan: Plan
  effectivePlan: Plan
  /** ISO instant. Absent means the plan has no end. */
  planExpiresAt?: string
  entitlements: Entitlements
  addons: ProviderAddon[]
}

/** This month's usage against the limits. The period is the UTC calendar month, end exclusive. */
export type PlanUsage = {
  activeServices: number
  bookingsThisMonth: number
  periodStart: string
  periodEnd: string
}

export type ProviderPlanWithUsage = ProviderPlan & {
  usage: PlanUsage
  billing: ProviderBilling | null
  /** A bigger plan that would cost less than the plan plus the add-ons paid for now, or null. */
  betterPlan: PaidPlan | null
}

/** A row of the admin plan screen — `GET /admin/providers`. */
export type AdminProvider = {
  id: string
  name: string
  email: string
  slug?: string
  listed: boolean
  plan: Plan
  effectivePlan: Plan
  planExpiresAt?: string
  /** Live add-ons from both sources; only the `admin` ones are this screen's to change. */
  addons: ProviderAddon[]
  /** `'paddle'` while a Paddle subscription is live — its webhook overwrites a manual change. */
  billing?: 'paddle'
}

export type AdminProvidersList = {
  items: AdminProvider[]
  total: number
  page: number
  perPage: number
  pageCount: number
}

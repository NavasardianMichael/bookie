export const PLANS = {
  free: 'free',
  basic: 'basic',
  standard: 'standard',
  premium: 'premium',
} as const

/**
 * Cheapest first — the order `/pricing` and the Plan tab list them in. Mirrors
 * `PLAN_ORDER` in `server/src/services/plans.ts`, pinned by
 * `tests/unit/server/planErrors.spec.ts`. The limits themselves are **not** mirrored:
 * the API sends them (`GET /plans`, `personal.entitlements`), so they change in one place.
 */
export const PLAN_ORDER = [PLANS.free, PLANS.basic, PLANS.standard, PLANS.premium] as const

/**
 * Add-ons — one feature, or a pack of capacity, sold monthly on top of any plan
 * (docs/BILLING.md → *Add-ons*). The four features are named after the entitlement each
 * grants. Like the plans, only the names are mirrored here: what each one adds, costs and
 * which plans already include it come from `GET /plans/addons`.
 */
export const ADDONS = {
  customSlug: 'customSlug',
  telegramNotifications: 'telegramNotifications',
  calendarFeed: 'calendarFeed',
  removeBranding: 'removeBranding',
  extraServices: 'extraServices',
  extraBookings: 'extraBookings',
} as const

/** Catalogue order. Mirrors `ADDON_ORDER` in `server/src/services/plans.ts`, pinned by `planErrors.spec.ts`. */
export const ADDON_ORDER = [
  ADDONS.customSlug,
  ADDONS.telegramNotifications,
  ADDONS.calendarFeed,
  ADDONS.removeBranding,
  ADDONS.extraServices,
  ADDONS.extraBookings,
] as const

/** Who granted an add-on: bought through Paddle, or given by an admin. */
export const ADDON_SOURCES = {
  paddle: 'paddle',
  admin: 'admin',
} as const

/**
 * Stable codes from the API's `PLAN_ERROR` (`server/src/lib/plan-errors.ts`) for a
 * provider-side write the plan does not cover. Their copy is `Errors.codes.*`, and a
 * status override on the call site cannot mask it (`resolveErrorText`).
 */
/** antd `Tag` preset colours per plan — the badge on the admin providers screen. */
export const PLAN_TAG_COLORS = {
  [PLANS.free]: 'default',
  [PLANS.basic]: 'blue',
  [PLANS.standard]: 'purple',
  [PLANS.premium]: 'gold',
} as const

export const PLAN_ERROR_CODES = {
  serviceLimit: 4101,
  featureLocked: 4102,
  photoImportLimit: 4103,
  bookingLimit: 4104,
  profileAssistantLimit: 4105,
} as const

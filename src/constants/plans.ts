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
 * Stable codes from the API's `PLAN_ERROR` (`server/src/lib/plan-errors.ts`) for a
 * provider-side write the plan does not cover. Their copy is `Errors.codes.*`, and a
 * status override on the call site cannot mask it (`resolveErrorText`).
 */
/** antd `Tag` preset colours per plan — one badge language on the admin screen and the Plan tab. */
export const PLAN_TAG_COLORS = {
  [PLANS.free]: 'default',
  [PLANS.basic]: 'blue',
  [PLANS.standard]: 'purple',
  [PLANS.premium]: 'gold',
} as const

export const PLAN_ERROR_CODES = {
  serviceLimit: 4101,
  featureLocked: 4102,
} as const

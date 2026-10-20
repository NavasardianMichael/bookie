import { Router } from 'express'
import { isAddonPurchasable, isPlanPurchasable } from './billing.js'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapProviderBilling, mapProviderPlan } from '../mappers/entities.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import {
  ADDON_CATALOGUE,
  ADDON_ORDER,
  ADDON_PRICES,
  betterPlanFor,
  bookingPeriod,
  effectivePlan,
  ENTITLEMENT_SELECT,
  heldAddons,
  isPaidPlan,
  maxAddonQuantity,
  PLAN_CATALOGUE,
  PLAN_ORDER,
  PLAN_PRICES,
  plansIncluding,
} from '../services/plans.js'
import { countActiveServices, countBookingsThisMonth } from '../services/planUsage.js'

/**
 * Plans: the public catalogue, and one provider's plan with what they have used of it.
 * The limits themselves live in `services/plans.ts`; these routes only publish them.
 */
export const plansRouter = Router()

/**
 * Every plan, cheapest first, with its limits and its monthly price — what `/pricing` and the
 * Plan tab's table render. Public: it describes the product, not anyone's account.
 *
 * `price` is the USD display fallback (`PLAN_PRICES`); the visitor's localized total comes
 * from `GET /billing/prices`. `purchasable` says whether this deployment can sell the plan
 * through Paddle — when it cannot (no key, no price id), the web offers the contact-form
 * request instead of a checkout. Free is never purchasable.
 */
plansRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    return ok(
      res,
      PLAN_ORDER.map((id) => ({
        id,
        entitlements: PLAN_CATALOGUE[id],
        price: PLAN_PRICES[id],
        purchasable: isPaidPlan(id) && isPlanPurchasable(id),
      }))
    )
  })
)

/**
 * Every add-on, in catalogue order — what `/pricing` and the Plan tab list beside the plans.
 * Public, like `GET /plans`.
 *
 * `step` is what one pack adds to its limit (null for a feature, which simply turns on the
 * entitlement it is named after); `maxQuantity` is how many can be held. `includedIn` names
 * the plans that already grant it, so the web knows where not to sell it without a copy of
 * the rule. `price` and `purchasable` mean what they mean on `GET /plans`.
 */
plansRouter.get(
  '/addons',
  asyncHandler(async (_req, res) => {
    return ok(
      res,
      ADDON_ORDER.map((id) => {
        const spec = ADDON_CATALOGUE[id]
        return {
          id,
          kind: spec.kind,
          step: spec.kind === 'capacity' ? spec.step : null,
          maxQuantity: maxAddonQuantity(id),
          price: ADDON_PRICES[id],
          purchasable: isAddonPurchasable(id),
          includedIn: plansIncluding(id),
        }
      })
    )
  })
)

/**
 * Mounted on `/provider-profile` beside `providerProfileRouter`, the way
 * `providerReviewsRouter` shares `/providers`: it answers for the session's own provider,
 * and its path does not overlap any of that router's.
 */
export const providerPlanRouter = Router()

/**
 * The caller's plan and add-ons, plus this month's usage — the Plan tab's meters.
 *
 * Its own read rather than more fields on `GET /provider-profile`, which every settings tab
 * loads and every profile save answers with: two counts on each of those would be paid by
 * screens that never show them. The profile payload still carries the entitlements, so the
 * SEO, services and analytics tabs gate without this call.
 *
 * `betterPlan` is a bigger plan that would cost less than the plan and the add-ons paid for
 * now (`betterPlanFor`), or null — the "Basic includes all of this" hint. Admin grants are
 * free, so only the `paddle` rows count towards what is paid.
 */
providerPlanRouter.get(
  '/plan',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        ...ENTITLEMENT_SELECT,
        paddleCustomerId: true,
        billingStatus: true,
        billingPeriodEndsAt: true,
        billingCancelsAt: true,
      },
    })
    if (!provider) throw new HttpError(404, 'Provider profile not found', 404)

    const now = new Date()
    const { start, end } = bookingPeriod(now)
    const [activeServices, bookingsThisMonth] = await Promise.all([
      countActiveServices(providerId),
      countBookingsThisMonth(providerId, now),
    ])

    return ok(res, {
      ...mapProviderPlan(provider, now),
      betterPlan: betterPlanFor(effectivePlan(provider, now), heldAddons(provider.addons, now, 'paddle')),
      billing: mapProviderBilling(provider),
      usage: {
        activeServices,
        bookingsThisMonth,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    })
  })
)

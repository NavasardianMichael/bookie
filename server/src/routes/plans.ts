import { Router } from 'express'
import { isPlanPurchasable } from './billing.js'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapProviderBilling, mapProviderPlan } from '../mappers/entities.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { bookingPeriod, isPaidPlan, PLAN_CATALOGUE, PLAN_ORDER, PLAN_PRICES } from '../services/plans.js'
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
 * Mounted on `/provider-profile` beside `providerProfileRouter`, the way
 * `providerReviewsRouter` shares `/providers`: it answers for the session's own provider,
 * and its path does not overlap any of that router's.
 */
export const providerPlanRouter = Router()

/**
 * The caller's plan plus this month's usage — the Plan tab's meters.
 *
 * Its own read rather than more fields on `GET /provider-profile`, which every settings tab
 * loads and every profile save answers with: two counts on each of those would be paid by
 * screens that never show them. The profile payload still carries the entitlements, so the
 * SEO, services and analytics tabs gate without this call.
 */
providerPlanRouter.get(
  '/plan',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        plan: true,
        planExpiresAt: true,
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

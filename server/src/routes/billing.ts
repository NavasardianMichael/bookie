import type { Addon } from '@prisma/client'
import { type Response, Router } from 'express'
import { config, isPaddleConfigured } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import { BILLING_ERROR } from '../lib/billing-errors.js'
import { resolveBookingLocale } from '../lib/booking-mail.js'
import { createKeyedLock } from '../lib/keyed-lock.js'
import {
  createCheckoutTransaction,
  createPortalSession,
  getSubscriptionItems,
  PaddleError,
  previewPrices,
  updateSubscriptionItems,
} from '../lib/paddle.js'
import { verifyPaddleSignature } from '../lib/paddle-signature.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { buildBillingCheckoutUrl } from '../lib/return-path.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import {
  addonPriceId,
  addonQuantityOf,
  cartLines,
  hasLiveSubscription,
  includedAddons,
  isChangeUnavailableCode,
  itemsForAddon,
  itemsForPlan,
  parseCart,
  parseSubscriptionEvent,
  parseSubscriptionItems,
  planOfLines,
  planPriceId,
  type SubscriptionLine,
} from '../services/billing.js'
import { applySubscriptionEvent } from '../services/billingSync.js'
import {
  ADDON_ORDER,
  effectivePlan,
  isAddon,
  isAddonIncluded,
  isPaidPlan,
  isPlan,
  maxAddonQuantity,
  PAID_PLANS,
  type PaidPlan,
  PLAN_ORDER,
} from '../services/plans.js'

/**
 * Provider subscriptions through Paddle Billing — the regionify flow, extended from one-time
 * badges to a monthly subscription holding a plan, add-ons, or both (docs/BILLING.md,
 * docs/PADDLE_SETUP.md).
 *
 * 1. `POST /billing/checkout` creates a transaction for a cart and returns Paddle's checkout
 *    URL — a page on our own domain carrying `?_ptxn=`, where Paddle.js opens the overlay.
 * 2. Paddle creates the subscription and calls `POST /billing/webhook`, which writes `plan`,
 *    `planExpiresAt` and the `paddle` add-on rows. The web's return page polls
 *    `GET /provider-profile/plan` until a subscription is live.
 * 3. Afterwards: `POST /billing/change-plan` and `POST /billing/addon` change the items,
 *    charged now, prorated; `POST /billing/portal` opens Paddle's customer portal to cancel,
 *    change the card or download invoices.
 *
 * A change reads the subscription's items **from Paddle** and writes the whole list back
 * (Paddle removes whatever is left out), under a per-provider lock so two quick clicks cannot
 * undo each other. Our copy lags by one webhook, so it is never what a change is built on.
 *
 * The webhook is a second router, mounted in `app.ts` **ahead of the JSON parser and the
 * same-origin check**: its signature covers the raw bytes, and a server-to-server POST
 * carries no `Origin`, which `requireSameOrigin` refuses in production.
 */
export const billingRouter = Router()
export const paddleWebhookRouter = Router()

const catalogue = () => config.paddle.catalogue

/** A plan can be bought here: billing is configured and that plan has a Paddle price. */
export const isPlanPurchasable = (plan: PaidPlan): boolean => isPaddleConfigured() && Boolean(planPriceId(catalogue(), plan))

/** An add-on can be bought here: billing is configured and that add-on has a Paddle price. */
export const isAddonPurchasable = (addon: Addon): boolean =>
  isPaddleConfigured() && Boolean(addonPriceId(catalogue(), addon))

const notConfigured = (): HttpError => new HttpError(503, 'Billing is not available', BILLING_ERROR.notConfigured)

const lastItem = (): HttpError =>
  new HttpError(
    409,
    'That would leave nothing on the subscription. Cancel it from the billing portal instead.',
    BILLING_ERROR.lastItem
  )

/**
 * Paddle refused or never answered. 502: the request was fine, the upstream was not — which
 * is also the status the web classifies as worth a Retry. A refusal that only means "not right
 * now" (a renewal processing, a failed payment) is a 409 with its own code instead, because a
 * Retry cannot get past it.
 */
const upstream = (error: unknown): never => {
  if (error instanceof PaddleError) {
    if (isChangeUnavailableCode(error.paddleCode)) {
      throw new HttpError(409, 'The subscription cannot be changed right now', BILLING_ERROR.changeUnavailable)
    }
    throw new HttpError(502, `Paddle: ${error.message}`, 502)
  }
  throw error
}

const BILLING_SELECT = {
  id: true,
  plan: true,
  planExpiresAt: true,
  paddleCustomerId: true,
  paddleSubscriptionId: true,
  billingStatus: true,
} as const

const loadBilling = async (providerId: string) => {
  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: BILLING_SELECT })
  if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
  return provider
}

/** The subscription this provider can change, or `noSubscription`. */
const liveSubscriptionId = (provider: Awaited<ReturnType<typeof loadBilling>>): string => {
  if (!hasLiveSubscription(provider) || !provider.paddleSubscriptionId) {
    throw new HttpError(409, 'There is no subscription to change', BILLING_ERROR.noSubscription)
  }
  return provider.paddleSubscriptionId
}

/** Paddle's current items for a subscription, as the item builders take them. */
const liveLines = async (subscriptionId: string): Promise<SubscriptionLine[]> => {
  const raw = await getSubscriptionItems(subscriptionId).catch(upstream)
  return parseSubscriptionItems(raw).map(({ priceId, quantity }) => ({ priceId, quantity }))
}

/** One provider's billing changes, one at a time — see the header. */
const billingLock = createKeyedLock()

/**
 * Sixty a minute per address. Public, and each call is a Paddle request — Paddle rate-limits
 * our key, so an unbounded endpoint would let one visitor spend it for everyone.
 */
const pricesLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 })

/**
 * Checkouts and changes per provider — each one is a Paddle write. Twenty an hour is also
 * Paddle's own limit on immediately charged changes to one subscription.
 */
const writeLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })

const assertWriteAllowed = (res: Response, key: string): void => {
  const verdict = writeLimiter(key)
  if (verdict.allowed) return
  res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
  throw new HttpError(429, 'Too many billing requests. Please try again later.', 429)
}

/**
 * Whether Paddle can place this address. A loopback or private one (local development, or a
 * misconfigured proxy) is left out of the preview, which Paddle then prices in the account's
 * default currency instead of refusing.
 */
const isPublicIp = (ip: string | undefined): ip is string => {
  if (!ip) return false
  const v4 = ip.replace(/^::ffff:/, '')
  if (v4 === '::1' || v4.startsWith('fc') || v4.startsWith('fd') || v4.startsWith('fe80')) return false
  return !/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(v4)
}

/**
 * Every paid plan's and every add-on's monthly price as Paddle would charge this visitor —
 * localized currency, tax included — keyed by plan or add-on, or null where it cannot say. A
 * pack is priced for one. The web shows its USD fallback for a null, so this answers 200 with
 * nulls rather than failing when Paddle is unconfigured, unreachable, or cannot place a
 * private address (local dev).
 */
billingRouter.get(
  '/prices',
  asyncHandler(async (req, res) => {
    const verdict = pricesLimiter(`ip:${req.ip ?? 'unknown'}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many requests. Please try again later.', 429)
    }

    const prices: Record<PaidPlan | Addon, string | null> = Object.fromEntries(
      [...PAID_PLANS, ...ADDON_ORDER].map((sku) => [sku, null])
    ) as Record<PaidPlan | Addon, string | null>

    const sold = [
      ...PAID_PLANS.filter(isPlanPurchasable).map((sku) => ({ sku, priceId: planPriceId(catalogue(), sku) })),
      ...ADDON_ORDER.filter(isAddonPurchasable).map((sku) => ({ sku, priceId: addonPriceId(catalogue(), sku) })),
    ]
    if (!sold.length) return ok(res, prices)

    try {
      const totals = await previewPrices(
        sold.map((item) => item.priceId),
        isPublicIp(req.ip) ? req.ip : undefined
      )
      for (const item of sold) prices[item.sku] = totals.get(item.priceId) ?? null
    } catch (error) {
      if (!(error instanceof PaddleError)) throw error
      // Already logged with Paddle's request id; the page falls back to USD.
    }

    return ok(res, prices)
  })
)

/**
 * Start a subscription: a Paddle transaction for a cart — a plan, add-ons, or both — answered
 * with its checkout URL.
 *
 * Refused with `alreadySubscribed` while a subscription is live — a second checkout would be
 * a second subscription billing the same provider twice; changes go through `change-plan` and
 * `addon`. Refused with `addonIncluded` for an add-on the plan already grants — the plan in
 * the cart, or else the one the provider holds now (an admin may have assigned one).
 *
 * `locale` decides which `/[lang]/billing/checkout` Paddle sends the browser to; it is
 * allowlisted, so no request text reaches the URL.
 */
billingRouter.post(
  '/checkout',
  requireProvider,
  asyncHandler(async (req, res) => {
    const cart = parseCart(req.body)
    if ((cart.plan && !isPlanPurchasable(cart.plan)) || cart.addons.some((line) => !isAddonPurchasable(line.addon))) {
      throw notConfigured()
    }

    const provider = await loadBilling(req.session!.profileId)
    if (hasLiveSubscription(provider)) {
      throw new HttpError(409, 'A subscription is already active. Change it instead.', BILLING_ERROR.alreadySubscribed)
    }

    const base = cart.plan ?? effectivePlan(provider, new Date())
    const included = includedAddons(base, cart.addons)
    if (included.length) {
      throw new HttpError(409, `The ${base} plan already includes ${included.join(', ')}`, BILLING_ERROR.addonIncluded)
    }

    assertWriteAllowed(res, `provider:${provider.id}`)

    const checkoutUrl = await createCheckoutTransaction({
      items: cartLines(cart, catalogue()),
      providerId: provider.id,
      customerId: provider.paddleCustomerId,
      checkoutUrl: buildBillingCheckoutUrl(config.corsOrigin, resolveBookingLocale(req.body?.locale)),
    }).catch(upstream)

    return ok(res, { checkoutUrl }, 201)
  })
)

/**
 * Move a live subscription to another plan, charged now, prorated (`lib/paddle.ts`).
 *
 * The add-ons the new plan includes are dropped with it, so nobody pays twice; every other
 * add-on stays. `free` removes the plan item and keeps the add-ons — with none left that is a
 * cancellation, which belongs in the billing portal (`lastItem`). Moving to a paid plan
 * withdraws a pending cancellation.
 *
 * 202: Paddle has accepted the change, and the webhook — not this route — writes the result,
 * so there is one writer of billing state.
 */
billingRouter.post(
  '/change-plan',
  requireProvider,
  asyncHandler(async (req, res) => {
    const plan: unknown = req.body?.plan
    if (!isPlan(plan)) throw new HttpError(400, `plan must be one of: ${PLAN_ORDER.join(', ')}`, 400)
    if (!isPaddleConfigured() || (isPaidPlan(plan) && !isPlanPurchasable(plan))) throw notConfigured()

    const provider = await loadBilling(req.session!.profileId)
    const subscriptionId = liveSubscriptionId(provider)

    assertWriteAllowed(res, `provider:${provider.id}`)

    const dropped = await billingLock(provider.id, async () => {
      const result = itemsForPlan(await liveLines(subscriptionId), plan, catalogue())
      if (!result.items.length) throw lastItem()
      await updateSubscriptionItems(subscriptionId, { items: result.items, withdrawCancel: isPaidPlan(plan) }).catch(upstream)
      return result.dropped
    })

    console.info(
      `[billing] provider ${provider.id} asked to switch ${provider.plan} -> ${plan}${ 
        dropped.length ? `, dropping ${dropped.join(', ')}` : ''}`
    )
    return ok(res, true, 202)
  })
)

/**
 * Set how many of one add-on a live subscription holds: 1 to buy a feature, a pack count, 0
 * to remove it. Charged now, prorated; a removal is credited. A Free provider with no
 * subscription buys through `checkout` instead (`noSubscription` tells the client so).
 *
 * Refused with `addonIncluded` when the subscription's plan already grants it, and `lastItem`
 * when removing it would leave the subscription empty. Buying withdraws a pending
 * cancellation; removing leaves it in place.
 */
billingRouter.post(
  '/addon',
  requireProvider,
  asyncHandler(async (req, res) => {
    const addon = req.body?.addon
    if (!isAddon(addon)) throw new HttpError(400, `addon must be one of: ${ADDON_ORDER.join(', ')}`, 400)
    const quantity = req.body?.quantity
    const max = maxAddonQuantity(addon)
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0 || quantity > max) {
      throw new HttpError(400, `quantity must be a whole number from 0 to ${max}`, 400)
    }
    if (!isPaddleConfigured() || (quantity > 0 && !isAddonPurchasable(addon))) throw notConfigured()

    const provider = await loadBilling(req.session!.profileId)
    const subscriptionId = liveSubscriptionId(provider)

    assertWriteAllowed(res, `provider:${provider.id}`)

    await billingLock(provider.id, async () => {
      const current = await liveLines(subscriptionId)
      const plan = planOfLines(current, catalogue())
      if (quantity > 0 && isAddonIncluded(plan, addon)) {
        throw new HttpError(409, `The ${plan} plan already includes ${addon}`, BILLING_ERROR.addonIncluded)
      }

      const held = addonQuantityOf(current, addon, catalogue())
      if (held === quantity) return

      const items = itemsForAddon(current, addon, quantity, catalogue())
      if (!items.length) throw lastItem()
      await updateSubscriptionItems(subscriptionId, { items, withdrawCancel: quantity > held }).catch(upstream)
    })

    console.info(`[billing] provider ${provider.id} asked for ${addon} ×${quantity}`)
    return ok(res, true, 202)
  })
)

/**
 * A fresh link into Paddle's customer portal for this provider's subscription. Created per
 * click: the token in it is temporary and must not be cached or stored.
 */
billingRouter.post(
  '/portal',
  requireProvider,
  asyncHandler(async (req, res) => {
    if (!isPaddleConfigured()) throw notConfigured()

    const provider = await loadBilling(req.session!.profileId)
    if (!provider.paddleCustomerId) {
      throw new HttpError(409, 'There is no billing account yet', BILLING_ERROR.noSubscription)
    }

    const url = await createPortalSession(provider.paddleCustomerId, provider.paddleSubscriptionId).catch(upstream)
    return ok(res, { url })
  })
)

/**
 * Paddle's notifications. The body arrives as raw bytes (`express.raw` in `app.ts`) because
 * the signature covers exactly those bytes.
 *
 * - **401** on a bad or missing signature — and on a missing secret, which is logged as a
 *   misconfiguration: an unverifiable event is never applied.
 * - **200** for anything verified but irrelevant (a `transaction.*` event, an unknown price,
 *   no matching provider): retrying could not change the outcome.
 * - **500** only when applying it failed on our side, so Paddle retries.
 */
paddleWebhookRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const raw: unknown = req.body
    if (!Buffer.isBuffer(raw) || raw.length === 0) return fail(res, 'Missing body', 400, 400)

    if (config.paddle.webhookSecrets.length === 0) {
      console.error('[billing] webhook received but PADDLE_WEBHOOK_SECRET is not set; rejected')
    }

    const verdict = verifyPaddleSignature(raw, req.get('Paddle-Signature') ?? '', config.paddle.webhookSecrets)
    if (!verdict.ok) {
      console.warn('[billing] webhook signature did not verify; rejected')
      return fail(res, 'Invalid signature', 401, 401)
    }
    if (verdict.secretIndex > 0) {
      console.warn('[billing] webhook verified with a fallback secret — the secret rotation is not finished')
    }

    let body: unknown
    try {
      body = JSON.parse(raw.toString('utf8'))
    } catch {
      return fail(res, 'Malformed JSON body', 400, 400)
    }

    const event = parseSubscriptionEvent(body)
    if (!event) {
      const type = (body as { event_type?: unknown } | null)?.event_type
      console.info(`[billing] webhook ${typeof type === 'string' ? type : 'event'} ignored`)
      return ok(res, true)
    }

    await applySubscriptionEvent(event)
    return ok(res, true)
  })
)

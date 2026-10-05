import { type Response, Router } from 'express'
import { config, isPaddleConfigured } from '../config.js'
import { fail, ok } from '../lib/api-response.js'
import { BILLING_ERROR } from '../lib/billing-errors.js'
import { resolveBookingLocale } from '../lib/booking-mail.js'
import {
  changeSubscriptionPrice,
  createCheckoutTransaction,
  createPortalSession,
  PaddleError,
  previewPrices,
} from '../lib/paddle.js'
import { verifyPaddleSignature } from '../lib/paddle-signature.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { buildBillingCheckoutUrl } from '../lib/return-path.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { hasLiveSubscription, parseSubscriptionEvent } from '../services/billing.js'
import { applySubscriptionEvent } from '../services/billingSync.js'
import { isPaidPlan, PAID_PLANS, type PaidPlan } from '../services/plans.js'

/**
 * Provider subscriptions through Paddle Billing — the regionify flow, extended from one-time
 * badges to monthly plans (docs/BILLING.md, docs/PADDLE_SETUP.md).
 *
 * 1. `POST /billing/checkout` creates a transaction and returns Paddle's checkout URL — a
 *    page on our own domain carrying `?_ptxn=`, where Paddle.js opens the overlay.
 * 2. Paddle creates the subscription and calls `POST /billing/webhook`, which writes `plan`
 *    and `planExpiresAt`. The web's return page polls `GET /provider-profile/plan` until the
 *    plan bought is the plan in force.
 * 3. Afterwards: `POST /billing/change-plan` switches price, prorated; `POST /billing/portal`
 *    opens Paddle's customer portal to cancel, change the card or download invoices.
 *
 * The webhook is a second router, mounted in `app.ts` **ahead of the JSON parser and the
 * same-origin check**: its signature covers the raw bytes, and a server-to-server POST
 * carries no `Origin`, which `requireSameOrigin` refuses in production.
 */
export const billingRouter = Router()
export const paddleWebhookRouter = Router()

/** The price id a plan is sold at, or an empty string where this deployment sells none. */
const priceIdFor = (plan: PaidPlan): string => config.paddle.priceIds[plan]

/** A plan can be bought here: billing is configured and that plan has a Paddle price. */
export const isPlanPurchasable = (plan: PaidPlan): boolean => isPaddleConfigured() && Boolean(priceIdFor(plan))

const notConfigured = (): HttpError => new HttpError(503, 'Billing is not available', BILLING_ERROR.notConfigured)

/**
 * Paddle refused or never answered. 502: the request was fine, the upstream was not — which
 * is also the status the web classifies as worth a Retry.
 */
const upstream = (error: unknown): never => {
  if (error instanceof PaddleError) throw new HttpError(502, `Paddle: ${error.message}`, 502)
  throw error
}

const BILLING_SELECT = {
  id: true,
  plan: true,
  paddleCustomerId: true,
  paddleSubscriptionId: true,
  billingStatus: true,
} as const

const loadBilling = async (providerId: string) => {
  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: BILLING_SELECT })
  if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
  return provider
}

/**
 * Sixty a minute per address. Public, and each call is a Paddle request — Paddle rate-limits
 * our key, so an unbounded endpoint would let one visitor spend it for everyone.
 */
const pricesLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 })

/** Checkouts and switches per provider — each one is a Paddle write. */
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
 * Each paid plan's monthly price as Paddle would charge this visitor — localized currency,
 * tax included — or null where it cannot say. The pricing page shows its USD fallback for a
 * null, so this answers 200 with nulls rather than failing when Paddle is unconfigured,
 * unreachable, or cannot place a private address (local dev).
 */
billingRouter.get(
  '/prices',
  asyncHandler(async (req, res) => {
    const verdict = pricesLimiter(`ip:${req.ip ?? 'unknown'}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many requests. Please try again later.', 429)
    }

    const prices = Object.fromEntries(PAID_PLANS.map((plan) => [plan, null])) as Record<PaidPlan, string | null>
    const sold = PAID_PLANS.filter(isPlanPurchasable)
    if (!sold.length) return ok(res, prices)

    try {
      const totals = await previewPrices(sold.map(priceIdFor), isPublicIp(req.ip) ? req.ip : undefined)
      for (const plan of sold) prices[plan] = totals.get(priceIdFor(plan)) ?? null
    } catch (error) {
      if (!(error instanceof PaddleError)) throw error
      // Already logged with Paddle's request id; the page falls back to USD.
    }

    return ok(res, prices)
  })
)

/**
 * Start a subscription: a Paddle transaction for one plan, answered with its checkout URL.
 *
 * Refused with `alreadySubscribed` while a subscription is live — a second checkout would be
 * a second subscription billing the same provider twice. Switching is `change-plan`.
 *
 * `locale` decides which `/[lang]/billing/checkout` Paddle sends the browser to; it is
 * allowlisted, so no request text reaches the URL.
 */
billingRouter.post(
  '/checkout',
  requireProvider,
  asyncHandler(async (req, res) => {
    const plan = req.body?.plan
    if (!isPaidPlan(plan)) throw new HttpError(400, `plan must be one of: ${PAID_PLANS.join(', ')}`, 400)
    if (!isPlanPurchasable(plan)) throw notConfigured()

    const provider = await loadBilling(req.session!.profileId)
    if (hasLiveSubscription(provider)) {
      throw new HttpError(409, 'A subscription is already active. Switch plans instead.', BILLING_ERROR.alreadySubscribed)
    }

    assertWriteAllowed(res, `provider:${provider.id}`)

    const checkoutUrl = await createCheckoutTransaction({
      priceId: priceIdFor(plan),
      providerId: provider.id,
      customerId: provider.paddleCustomerId,
      checkoutUrl: buildBillingCheckoutUrl(config.corsOrigin, resolveBookingLocale(req.body?.locale)),
    }).catch(upstream)

    return ok(res, { checkoutUrl }, 201)
  })
)

/**
 * Move a live subscription to another plan, prorated now (`lib/paddle.ts`). 202: Paddle has
 * accepted the change, and the webhook — not this route — writes the new plan, so there is
 * one writer of billing state. A pending cancellation is withdrawn with it.
 */
billingRouter.post(
  '/change-plan',
  requireProvider,
  asyncHandler(async (req, res) => {
    const plan = req.body?.plan
    if (!isPaidPlan(plan)) throw new HttpError(400, `plan must be one of: ${PAID_PLANS.join(', ')}`, 400)
    if (!isPlanPurchasable(plan)) throw notConfigured()

    const provider = await loadBilling(req.session!.profileId)
    if (!hasLiveSubscription(provider) || !provider.paddleSubscriptionId) {
      throw new HttpError(409, 'There is no subscription to change', BILLING_ERROR.noSubscription)
    }

    assertWriteAllowed(res, `provider:${provider.id}`)

    await changeSubscriptionPrice(provider.paddleSubscriptionId, priceIdFor(plan)).catch(upstream)

    console.info(`[billing] provider ${provider.id} asked to switch ${provider.plan} -> ${plan}`)
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

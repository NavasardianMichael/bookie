import { config } from '../config.js'

/**
 * The only client for the Paddle Billing API, and the only module that reads
 * `PADDLE_API_KEY` — the same rule `lib/mail.ts` keeps for the mail key. The key is never
 * returned, put in an error, or logged; a failed call logs Paddle's `error.code` and
 * `meta.request_id`, which are the two things Paddle support asks for.
 *
 * Plain `fetch`, not `@paddle/paddle-node-sdk`, exactly as regionify does it: five calls do
 * not justify an SDK, and every response is narrowed to the fields used.
 *
 * Endpoints (docs/PADDLE_SETUP.md lists the API key permissions each one needs):
 *
 * | Call | Paddle | Permission |
 * |---|---|---|
 * | `createCheckoutTransaction` | `POST /transactions` | `transaction.write` |
 * | `getTransactionProviderId` | `GET /transactions/{id}` | `transaction.read` |
 * | `previewPrices` | `POST /pricing-preview` | `transaction.read` |
 * | `changeSubscriptionPrice` | `PATCH /subscriptions/{id}` | `subscription.write` |
 * | `createPortalSession` | `POST /customers/{id}/portal-sessions` | `customer_portal_session.write` |
 */

const PADDLE_TIMEOUT_MS = 10_000

const apiBase = (): string => (config.paddle.sandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com')

/** A Paddle call that did not succeed. `message` is Paddle's own detail — never the key. */
export class PaddleError extends Error {
  constructor(
    message: string,
    public status: number,
    public paddleCode?: string,
    public requestId?: string
  ) {
    super(message)
  }
}

type PaddleErrorBody = { error?: { code?: string; detail?: string }; meta?: { request_id?: string } }

const request = async <T>(method: 'GET' | 'POST' | 'PATCH', path: string, operation: string, body?: object): Promise<T> => {
  if (!config.paddle.apiKey) throw new PaddleError('Paddle is not configured', 0)

  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.paddle.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(PADDLE_TIMEOUT_MS),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Paddle request failed'
    console.error(`[paddle] ${operation} did not complete: ${message}`)
    throw new PaddleError(message, 0)
  }

  const parsed = (await response.json().catch(() => null)) as ({ data?: T } & PaddleErrorBody) | null

  if (!response.ok || !parsed?.data) {
    const detail = parsed?.error?.detail ?? `Paddle responded ${response.status}`
    // Status, Paddle's code and request id — never the request headers, which carry the key.
    console.error(
      `[paddle] ${operation} failed: ${response.status} ${parsed?.error?.code ?? ''} ${detail}` +
        ` (request ${parsed?.meta?.request_id ?? 'unknown'}, ${config.paddle.sandbox ? 'sandbox' : 'live'})`
    )
    throw new PaddleError(detail, response.status, parsed?.error?.code, parsed?.meta?.request_id)
  }

  return parsed.data
}

/**
 * A transaction for one plan, whose `checkout.url` Paddle returns with `?_ptxn=txn_…`
 * appended. That URL is a page **on our own approved domain** that loads Paddle.js, which
 * opens the overlay on seeing `_ptxn` — Paddle Billing has no hosted checkout page. The page
 * is `/[lang]/billing/checkout` (`BillingCheckoutClient`).
 *
 * `custom_data.provider_id` is how the webhook finds the provider. `customer_id` is passed
 * when the provider already has one, so a second subscription does not mint a second customer.
 */
export const createCheckoutTransaction = async (input: {
  priceId: string
  providerId: string
  customerId: string | null
  checkoutUrl: string
}): Promise<string> => {
  const data = await request<{ checkout?: { url?: string } }>('POST', '/transactions', 'checkout', {
    items: [{ price_id: input.priceId, quantity: 1 }],
    custom_data: { provider_id: input.providerId },
    ...(input.customerId ? { customer_id: input.customerId } : {}),
    checkout: { url: input.checkoutUrl },
  })
  const url = data.checkout?.url
  if (!url) throw new PaddleError('Paddle did not return a checkout URL', 502)
  return url
}

/**
 * The provider a transaction was opened for. The webhook's last resort: Paddle documents
 * `custom_data` on the transaction, and does not promise it on the subscription it creates.
 */
export const getTransactionProviderId = async (transactionId: string): Promise<string | undefined> => {
  const data = await request<{ custom_data?: { provider_id?: unknown } | null }>(
    'GET',
    `/transactions/${encodeURIComponent(transactionId)}`,
    'transaction lookup'
  )
  const id = data.custom_data?.provider_id
  return typeof id === 'string' && id ? id : undefined
}

/**
 * Each price's total as Paddle would charge this visitor — localized currency and tax from
 * their IP — keyed by price id. `formatted_totals.total` is already formatted for display.
 */
export const previewPrices = async (priceIds: string[], customerIp: string | undefined): Promise<Map<string, string>> => {
  const data = await request<{
    details?: { line_items?: { price?: { id?: string }; formatted_totals?: { total?: string } }[] }
  }>('POST', '/pricing-preview', 'pricing preview', {
    items: priceIds.map((priceId) => ({ price_id: priceId, quantity: 1 })),
    ...(customerIp ? { customer_ip_address: customerIp } : {}),
  })

  const totals = new Map<string, string>()
  for (const item of data.details?.line_items ?? []) {
    if (item.price?.id && item.formatted_totals?.total) totals.set(item.price.id, item.formatted_totals.total)
  }
  return totals
}

/**
 * Move a subscription to another price, prorated now: an upgrade is charged the difference
 * today, a downgrade credited. `scheduled_change: null` withdraws a pending cancellation —
 * choosing a plan is the opposite of leaving. The webhook applies the result.
 */
export const changeSubscriptionPrice = async (subscriptionId: string, priceId: string): Promise<void> => {
  await request('PATCH', `/subscriptions/${encodeURIComponent(subscriptionId)}`, 'change plan', {
    items: [{ price_id: priceId, quantity: 1 }],
    proration_billing_mode: 'prorated_immediately',
    scheduled_change: null,
  })
}

/**
 * An authenticated link into Paddle's customer portal — cancel, payment method, invoices.
 * The token in it is temporary, so it is created per click and never stored or cached.
 */
export const createPortalSession = async (customerId: string, subscriptionId: string | null): Promise<string> => {
  const data = await request<{ urls?: { general?: { overview?: string } } }>(
    'POST',
    `/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    'portal session',
    subscriptionId ? { subscription_ids: [subscriptionId] } : {}
  )
  const url = data.urls?.general?.overview
  if (!url) throw new PaddleError('Paddle did not return a portal URL', 502)
  return url
}

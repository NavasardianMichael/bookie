# Paddle setup — sandbox, then live

How to wire Paddle Billing to Bookie's provider subscriptions. What the integration *does*
— the flow, the state table, the webhook rules — is [`docs/BILLING.md`](BILLING.md); this is
the operator's checklist. It follows regionify's `docs/PADDLE_AND_PLANS_SETUP.md`, whose
integration has taken payments in both environments, adapted from one-time badges to three
**monthly recurring prices**.

Sandbox and live are **separate Paddle accounts**: separate products, prices, keys, tokens,
webhook secrets and approved domains. Do the sandbox end to end first.

## What lives where

| Variable | Where | What |
|---|---|---|
| `PADDLE_API_KEY` | `server/.env` / `ENV_API_BASE64` | Server API key. Read only by `server/src/lib/paddle.ts` |
| `PADDLE_WEBHOOK_SECRET` | same | The notification destination's signing secret. Comma-separated during a rotation |
| `PADDLE_SANDBOX` | same | `true` → `sandbox-api.paddle.com`; anything else → live |
| `PADDLE_PRICE_ID_BASIC` / `_STANDARD` / `_PREMIUM` | same | One monthly price per paid plan (`pri_…`). A plan without one is not sold through Paddle |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | root `.env.local` / repo Secret or Variable | Client-side token for Paddle.js — public by design |
| `NEXT_PUBLIC_PADDLE_ENV` | same | `sandbox` or `production`. Must agree with `PADDLE_SANDBOX` |

With none of them set, `/pricing` shows the USD prices from `PLAN_PRICES` and every paid
plan falls back to the contact-form request. That is the default for local development.

## 1. Product and prices

Paddle → **Catalog → Products → New product**: one product, e.g. *Bookie plan*. On it, three
prices, each **recurring, billed every 1 month**:

| Plan | Price | Env var |
|---|---|---|
| Basic | USD 4.99 | `PADDLE_PRICE_ID_BASIC` |
| Standard | USD 14.99 | `PADDLE_PRICE_ID_STANDARD` |
| Premium | USD 24.99 | `PADDLE_PRICE_ID_PREMIUM` |

They must match `PLAN_PRICES` in `server/src/services/plans.ts`, which is what `/pricing`
shows until Paddle's localized preview loads. Add per-country price overrides in Paddle if
you want round local prices; the pricing page picks them up through `/pricing-preview`.

## 2. API key

**Developer Tools → Authentication → API keys → New API key** → `PADDLE_API_KEY`. Server
only, never shipped to the browser. Permissions — a key without them authenticates and then
answers every call with `403 forbidden`:

| Permission | Used by |
|---|---|
| `transaction.write` | `POST /transactions` — the checkout |
| `transaction.read` | `POST /pricing-preview`, and the webhook's fallback lookup of a transaction's `custom_data` |
| `subscription.read`, `subscription.write` | `PATCH /subscriptions/{id}` — switching plans |
| `customer_portal_session.write` | `POST /customers/{id}/portal-sessions` — Manage billing |

**Keys expire — 90 days by default, a year at most.** An expired key fails every call with
`invalid_token`. See *Rotation* below.

## 3. Client-side token

**Developer Tools → Authentication → Client-side tokens → New token** →
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`. It can only open a checkout for a transaction our API
created, which is why it may be public.

## 4. Approved domain and default payment link

Paddle only sends a checkout to a page on an approved domain, and that page must load
Paddle.js — Paddle Billing has no hosted checkout page.

1. **Checkout → Website approval → Add domain**: the web host (`CORS_ORIGIN`'s host, no
   scheme). Sandbox approves at once; live review takes 1–3 business days and checks that
   the site shows pricing, **Terms (naming Paddle as Merchant of Record), a Privacy Policy
   and a Refund Policy** — `/pricing`, `/terms`, `/privacy` and `/refund-policy`, all linked
   from the footer.
2. **Checkout → Checkout settings → Default payment link**:
   `https://<web host>/en/billing/checkout`. Each transaction also sets its own
   `checkout.url` in the provider's language (`buildBillingCheckoutUrl`); the default is
   what Paddle uses for links it sends itself, such as a renewal to pay.

## 5. Webhook

**Developer Tools → Notifications → New destination**:

- URL: `https://<api host>/billing/webhook` (production:
  `https://api.bookie.mnavasardian.com/billing/webhook`).
- Events: **every `subscription.*` event** — at least `subscription.created`,
  `subscription.updated`, `subscription.canceled`, `subscription.past_due`,
  `subscription.activated`, `subscription.paused`, `subscription.resumed`. Transaction
  events are not needed; they are answered 200 and ignored.
- Copy the **signing secret** (`pdl_ntfset_…`) → `PADDLE_WEBHOOK_SECRET`.

The route is mounted ahead of the JSON parser and the same-origin check (`server/src/app.ts`):
it verifies the HMAC over the raw bytes, then answers 401 to a bad signature, 200 to anything
it does not act on, and 500 only when applying the event failed on our side, so Paddle
retries exactly those.

## 6. Local testing — two tunnels

Paddle cannot reach `localhost`, and the checkout page must be on an approved domain, so run
both halves behind HTTPS tunnels (ngrok or similar):

```bash
ngrok http 7004   # web — becomes the approved domain
ngrok http 9004   # API — the webhook destination
```

- `server/.env`: `CORS_ORIGIN=https://<web tunnel>` (it is both the same-origin check and
  where checkouts are sent), the sandbox `PADDLE_*` values, `PADDLE_SANDBOX=true`.
- root `.env.local`: `NEXT_PUBLIC_API_URL=https://<api tunnel>`,
  `NEXT_PUBLIC_SITE_URL=https://<web tunnel>`, the sandbox client token,
  `NEXT_PUBLIC_PADDLE_ENV=sandbox`.
- Approve the web tunnel's host in the **sandbox** dashboard; set the default payment link
  and the webhook destination to the tunnels.
- Open the app **through the web tunnel**, not `localhost`, so the session cookie, the
  checkout URL and the approved domain all agree.
- `pnpm db:setup` (or `prisma migrate deploy` in `server/`) to apply the billing migration.

## 7. End-to-end test (sandbox)

1. Sign in as a seeded provider (`docs/DEV_CREDS.md`), open **Plan**, press **Upgrade** on
   Basic. The browser goes to `/en/billing/checkout?_ptxn=txn_…&plan=basic` and the overlay
   opens.
2. Pay with `4242 4242 4242 4242`, any future expiry, CVC `100`.
3. `/billing/return` shows *Confirming your payment…*, then *You are on the Basic plan*. In
   the database: `plan = basic`, `billingStatus = active`, `planExpiresAt` = period end + 3
   days, `paddleCustomerId` and `paddleSubscriptionId` set.
4. **Switch** to Premium from the Plan tab: the subscription changes in Paddle, the webhook
   moves `plan`, the tab shows Premium.
5. **Manage billing → cancel**: the tab shows *Cancelled — ends on …*; `planExpiresAt` equals
   `billingCancelsAt`.
6. **Developer Tools → Simulations**: send `subscription.past_due` (plan kept, expiry = period
   start + 7 days, the tab warns) and `subscription.canceled` (plan `free`). Re-send an older
   event: the log says *superseded … skipped*.

The sandbox has no "recent deliveries" view; Simulations is how to fire events at will.

## 8. Going live

1. Complete Paddle's business verification (1–3 business days).
2. Repeat steps 1–5 in the **live** dashboard — new product, prices, key, token, domain
   approval, default payment link, webhook destination.
3. Put the live `PADDLE_*` values in the production API env file, **without**
   `PADDLE_SANDBOX`, and rebuild `ENV_API_BASE64` (`pnpm env:base64 production`).
4. Set the repository Secrets or Variables `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (live token) and
   `NEXT_PUBLIC_PADDLE_ENV=production`; they are inlined at build time, so redeploy the web.
5. Smoke-test with a real card on your own provider account, then refund it from the
   Paddle dashboard.

## Rotation

**API key.** Several keys can be active at once, so rotation has no downtime: create a new
key with the same permissions, deploy it as `PADDLE_API_KEY`, check a checkout and the
pricing page, then revoke the old key.

**Webhook secret.** A destination's secret cannot be regenerated in place. Create a second
destination on the same URL and events, set `PADDLE_WEBHOOK_SECRET=<new>,<old>`, deploy,
delete the old destination, then drop the old secret. In between, each event arrives twice —
harmless, because applying a snapshot is idempotent. The API logs *verified with a fallback
secret* while the old one is still in use; when that stops, finish the rotation.

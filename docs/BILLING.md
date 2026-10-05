# Billing — plans, prices, Paddle and what each plan sells

**Only providers pay.** Consumers never pay us for anything, never see an upsell, and never
hit an error because of a provider's plan. Booking, reviewing, favouriting and reading a
public page stay free for good.

Plans are sold as **monthly subscriptions through Paddle Billing** (Phase 2). Paddle is our
reseller and Merchant of Record: it takes the payment, handles sales tax and VAT, and sends
receipts. Setting Paddle up — sandbox and live — is [`docs/PADDLE_SETUP.md`](PADDLE_SETUP.md).
Notifications, the reminder job and Telegram are [`docs/NOTIFICATIONS.md`](NOTIFICATIONS.md).

**Notifications go by email and Telegram only. There is no SMS**, and none is planned: it
costs per message, and email plus a free Telegram bot cover the same ground.

## The catalogue

The single source of truth is `PLAN_CATALOGUE` (limits and features) and `PLAN_PRICES`
(the USD display price) in [`server/src/services/plans.ts`](../server/src/services/plans.ts).
Change them there and nowhere else — the web reads them from the API (`GET /plans`,
`personal.entitlements` on the owner profile) and holds no copy.

| | Free | Basic | Standard | Premium |
|---|---|---|---|---|
| **Price** (USD, monthly) | $0 | $4.99 | $14.99 | $24.99 |
| Active services | 3 | 10 | 30 | unlimited |
| Online bookings a month | 50 | 300 | unlimited | unlimited |
| Analytics history | 30 days | 365 days | full | full |
| Custom `/p/<slug>` link | — | ✓ | ✓ | ✓ |
| Telegram notifications (the provider's own) | — | ✓ | ✓ | ✓ |
| Calendar sync (private iCal feed) | — | ✓ | ✓ | ✓ |
| No "Booking page by Bookie" line | — | ✓ | ✓ | ✓ |

**Every plan, Free included,** gets every email — new booking, changes, cancellations, and
appointment reminders for the provider and their clients — plus an add-to-calendar file for
clients, booking approvals, reviews and analytics. Paid plans sell capacity and convenience,
never the basics. `/pricing` lists the shared half (`PRICING_INCLUDED` in
`src/constants/pricing.ts`), which may only claim what ships.

`null` means unlimited. Every limit and feature must be non-decreasing from Free to Premium,
and every price strictly increasing — `tests/unit/server/plans.spec.ts` fails otherwise.

**A price lives in two places, deliberately.** What a provider is *charged* is the Paddle
price behind `PADDLE_PRICE_ID_<PLAN>`; `PLAN_PRICES` is only what `/pricing` shows before
Paddle's localized preview arrives (or when Paddle is not configured). Change both together.

## How a plan applies

- **`effectivePlan`** is the stored `Provider.plan`, or `free` once `planExpiresAt` has
  passed. It is computed on every read; nothing sweeps expired plans. An expiry therefore
  takes effect on the next request.
- **`getEntitlements(provider, now)`** returns the effective plan's limits and features. It
  is the only sanctioned way to gate anything — never read `Provider.plan` directly.
- **Two writers of `plan` and `planExpiresAt`:** the Paddle webhook, and an admin on
  `/admin/providers`. Neither changes how they are read.
- **Expiry is a last day, in UTC.** The admin picks the last day a plan covers; it ends at
  the UTC midnight after it (`src/helpers/plans.ts`). The booking month is the UTC calendar
  month too. `Provider.timeZone` exists (it is what the schedule is written in), but the
  allowance does not read it yet — see `docs/BACKLOG.md`.

## Where each limit bites

| Limit | Where | What happens |
|---|---|---|
| Active services | `POST`/`PUT /providers/:id/services` | Creating an active service, or switching one on, past the cap → `403`, code `4101` (`PLAN_ERROR.serviceLimit`). The services page shows "N of M" and disables Add and the activate switches at the cap |
| Custom link | `PATCH /provider-profile/seo` | Setting or changing the slug without `customSlug` → `403`, code `4102`. Unchanged and cleared slugs always pass. The SEO tab makes the field read-only |
| Online bookings | `POST /appointments` | At the cap → `409`, code `4202` (`BOOKING_ERROR.bookingFull`). See *The soft cap* |
| Analytics history | `GET /provider-profile/analytics` | Clamped to `now − historyDays`; the previous-period delta is skipped if it would reach behind that. The tab disables the longer presets |
| Telegram | `services/bookingNotify.ts` | A provider's own notices skip Telegram without `telegramNotifications`; email is unaffected. The Notifications tab says so. A *client's* Telegram is never gated |
| Calendar feed | `GET /provider-profile/calendar-feed`, `GET /calendar/:id/:token.ics` | Without `calendarFeed`: the settings route → `403`, `4102`; the feed itself → `404`, so a lapsed plan's subscribed calendar simply stops updating |
| Branding | `GET /providers/:id` | `details.showPoweredBy` — plan-neutral, like `onlineBooking` |

The codes live in import-free modules (`server/src/lib/plan-errors.ts`,
`server/src/lib/booking-errors.ts`, `server/src/lib/billing-errors.ts`), are mirrored in
`src/constants/plans.ts`, `src/constants/booking.ts` and `src/constants/billing.ts`, and are
pinned by `tests/unit/server/planErrors.spec.ts`, `bookingErrors.spec.ts` and
`billingErrors.spec.ts`. Their copy is `Errors.codes.*` in all 16 locales.

## The soft cap on bookings

The monthly allowance counts a provider's **non-cancelled bookings created this UTC month**
— by creation time, so a booking made in October for December counts in October, and a
cancelled or declined one gives its place back.

When it is spent:

- **The public page** carries `details.onlineBooking: 'full'` and swaps its calendar for a
  notice: *online booking is full this month — contact the provider*, with their phone and
  email. It never names a plan. A provider's own `available: false` reads `paused` the same
  way, and wins over `full`.
- **`POST /appointments`** refuses with `4202` before the overlap check, and the booking
  sheet flips to the same notice.
- **Reschedules are never refused** — they move a booking that already exists.
- **It is soft.** Count and insert are not one transaction, so two submits in the same
  instant can go one past the cap — the same race the slot overlap check already accepts
  (`docs/BACKLOG.md`).

## Provider emails about the plan

At 80% and at 100% of the allowance the provider gets one email each per month
(`server/src/services/planNotices.ts`, sender `server/src/lib/plan-mail.ts`), linking to the
Plan tab. The 100% email also goes out when a booking is *refused* — that is what tells a
provider whose plan lapsed mid-month, already past the smaller Free allowance, that clients
are being turned away. The stamps (`bookingCapWarnedAt`, `bookingCapReachedAt`) are claimed
by compare-and-set, so concurrent bookings send once, and either writer of `plan` clears
them when the effective plan changes (`planChangeStampReset`). **Not gated on notification
preferences**, for the reason the approval-request email is not: it is the only signal.

## Buying a plan — the Paddle flow

The mechanics are regionify's, which has taken live payments in both Paddle environments:
a transaction created server-side with plain `fetch`, a page on our own domain that loads
Paddle.js, a hand-verified HMAC webhook, and localized prices from `/pricing-preview`.
Regionify sells one-time badges; Bookie extends the same flow to subscriptions.

1. **Upgrade** on the Plan tab or `/pricing` calls `POST /billing/checkout` with the plan and
   locale (`useStartCheckout`). The API creates a Paddle transaction — the plan's price,
   `custom_data.provider_id`, the provider's Paddle customer if they have one — with
   `checkout.url` set to `/<locale>/billing/checkout`. It refuses with `4302`
   (`alreadySubscribed`) while a subscription is live.
2. Paddle answers that URL with `?_ptxn=txn_…`; the client adds `?plan=` and navigates there.
   **`/billing/checkout` loads Paddle.js, which opens the overlay on seeing `_ptxn`** —
   Paddle Billing has no hosted checkout page. It is public: Paddle also links there from
   its own emails (a renewal to pay).
3. On `checkout.completed` the page goes to `/billing/return?plan=…`, which polls
   `GET /provider-profile/plan` until **the plan bought** is the effective one
   (`useAwaitPlan`). On `checkout.closed` without a completion it goes back to the Plan tab.
   Paddle fires `checkout.closed` after `checkout.completed` too; `completedRef` keeps a
   paid checkout off the closed path.
4. Paddle creates the subscription and calls **`POST /billing/webhook`**, which writes `plan`,
   `planExpiresAt` and the billing columns. That webhook is the only writer of billing state;
   the routes above only ask Paddle for things.

Afterwards, from the Plan tab:

- **Switch** — `POST /billing/change-plan` moves the subscription to another price,
  `prorated_immediately` (an upgrade is charged the difference now, a downgrade credited),
  and withdraws a pending cancellation. The page waits for the webhook like the return page.
- **Manage billing** — `POST /billing/portal` opens Paddle's customer portal: cancel, change
  the card, download invoices. The link carries a temporary token and is created per click.
  Leaving a paid plan for Free is a cancellation there.

When Paddle is **not configured** (no key, or no price for a plan — every fresh clone),
`GET /plans` reports the plan `purchasable: false` and the web falls back to the contact-form
request: *Request upgrade* sends `topic: 'planUpgrade'`, and an admin assigns the plan on
`/admin/providers`.

## Subscription state → plan

The webhook handles every `subscription.*` event the same way, because each carries the
whole subscription (`services/billing.ts#subscriptionToFields`):

| Subscription | `plan` | `planExpiresAt` |
|---|---|---|
| `active`, `trialing` | the price's plan | period end + 3 days (`RENEWAL_GRACE_DAYS`) |
| … with a cancellation or pause scheduled | the price's plan | exactly when it takes effect; `billingCancelsAt` set |
| `past_due` — a renewal failed, Paddle is retrying (dunning) | the price's plan | period start + 7 days (`PAST_DUE_GRACE_DAYS`) |
| `paused`, `canceled` | `free` | none |
| a price this deployment does not sell | unchanged — logged | unchanged |

So **dunning → grace → free**: a failed card keeps the plan for a week, the Plan tab says the
payment failed and offers Manage billing, and the plan returns as soon as Paddle collects.
The expiry is set whenever a subscription is live, so even if every later webhook were lost
the plan would lapse on its own a few days after the last period Paddle reported.

**Ordering and idempotency.** Paddle delivers at least once, in no guaranteed order.
`billingEventAt` holds the `occurred_at` of the last event applied; an older one is ignored.
An event for a *different* subscription is applied only when it is live and the stored one is
not (someone who cancelled and later subscribed again), so a late event from the old
subscription cannot cancel the new one. Re-applying a snapshot writes the same row, which is
why there is no events table — and why the doubled deliveries of a webhook-secret rotation
are harmless.

**Finding the provider.** By `paddleSubscriptionId` once known; else the subscription's
`custom_data.provider_id`; else the checkout transaction's own `custom_data`, read back from
Paddle — Paddle documents `custom_data` on the transaction and promises nothing about it on
the subscription it creates.

**Admin overrides.** `/admin/providers` still sets any provider's plan, but on a provider with
a live subscription the next webhook event overwrites it. The row shows a *Paddle* tag and
says so. Comp a plan on someone who does not pay through Paddle.

The admin inbox gets a line (`sendInternalMail`) on `subscription.created`, `.canceled` and
`.past_due`.

## Downgrades never take anything away from consumers

- Services above a new, lower cap stay live and editable; the provider just cannot add or
  reactivate one until they are under it.
- A slug set before custom links were paid keeps resolving and survives every SEO save; it
  only cannot be changed. `GET /providers/:idOrSlug` never consults the plan, so a printed
  link never breaks.
- Bookings are never cancelled by a plan change.
- A client's reminders and Telegram notices do not depend on the provider's plan.

## Rollout

Every provider in production is on `free` until someone assigns otherwise. Before or right
after the first deploy of plans, give existing providers a grace plan from `/admin/providers`
— for example Basic with a last day six months out. A provider who later subscribes through
Paddle simply has the webhook take over.

## Roadmap

| Phase | Scope |
|---|---|
| 1 — done | Plans, entitlements, enforcement, admin assignment, Plan tab, `/pricing`, allowance emails |
| 2 — done | Paddle subscriptions: checkout, webhook, switch, customer portal, dunning → grace → free; prices on `/pricing`; Terms, Privacy and Refund pages |
| 3 — done | What paid tiers sell: the reminder sender, the `newBooking` provider email, cancellation notices, Telegram, the iCal feed, the "Booking page by Bookie" line |
| 4 | Team plans — needs Organization ownership, which does not exist (no User ↔ Organization link) |

Dropped, deliberately: **SMS** (email and Telegram cover it at no per-message cost),
**credits** (they existed to pay for SMS and paid placement) and **Featured placement on
Explore** (decided against). Credits were never meant for capacity either: a $1 charge per
extra service loses about a third to card fees and does not recur while hosting does;
capacity belongs in plans.

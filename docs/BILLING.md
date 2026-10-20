# Billing — plans, add-ons, prices, Paddle and what each one sells

**Only providers pay.** Consumers never pay us for anything, never see an upsell, and never
hit an error because of a provider's plan. Booking, reviewing, favouriting and reading a
public page stay free for good.

Plans, and the add-ons sold beside them (*Add-ons* below), are sold as **monthly
subscriptions through Paddle Billing** (Phase 2). Paddle is our
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
Every `PADDLE_PRICE_ID_*` is a comma-separated list — **the first id is sold, every id is
recognised** — so after a price change in Paddle, put the new id first and keep the old one:
subscribers stay on the price they bought, and the webhook must go on reading it.

## Add-ons

One feature, or a pack of capacity, sold **on its own, monthly, on top of any plan — Free
included**. The plans stay the bundles. `ADDON_CATALOGUE` and `ADDON_PRICES` in
`server/src/services/plans.ts` are the source of truth; the web reads them from
`GET /plans/addons` and holds no copy.

| Add-on (`Addon`) | Grants | USD / month | Max |
|---|---|---|---|
| `customSlug` | the custom `/p/<slug>` link | $1.99 | 1 |
| `telegramNotifications` | the provider's own Telegram notices | $1.99 | 1 |
| `calendarFeed` | the private iCal feed | $1.99 | 1 |
| `removeBranding` | no "Booking page by Bookie" line | $2.99 | 1 |
| `extraServices` | +5 active services per pack | $1.99 | 10 |
| `extraBookings` | +100 online bookings a month per pack | $1.99 | 10 |

The prices are placeholders, set so one or two add-ons cost less than Basic and a third
does not. Below about $2, Paddle's per-transaction fee (5% + 50¢) takes a third or more of a
lone add-on — a $1 add-on would net about 45¢. Two rules hold the catalogue together, and
`tests/unit/server/plans.spec.ts` fails on either:

- **Every add-on sells something Free lacks**, and each feature add-on is named after the
  entitlement it turns on.
- **Every plan costs less than the add-ons it would take to rebuild it from Free.** Rebuilding
  Basic costs $18.91 against its $4.99. Standard and Premium have unlimited bookings, which
  no number of packs reaches.

How they combine:

- **Merged in `getEntitlements`.** A feature add-on turns its entitlement on; a pack adds
  `step × quantity` to the limit; an unlimited limit stays unlimited. Rows from both writers
  merge (a feature held twice is one; packs add up, clamped to the maximum).
- **Never sold on top of a plan that includes it** (`isAddonIncluded`; the API answers
  `4304 addonIncluded`). `GET /plans/addons` publishes each add-on's `includedIn`, so the web
  needs no copy of the rule.
- **Dropped on a switch to a plan that includes it** (`services/billing.ts#itemsForPlan`), so
  nobody pays twice; every other add-on stays. The confirm dialog names what is dropped.
- **Stored per row in `ProviderAddon`, each with its own source and expiry.** The webhook
  replaces only `paddle` rows (every one with the subscription's lapse); an admin replaces
  only `admin` rows (`PATCH /admin/providers/:id/addons`, one last day for the grant). Neither
  writer can erase the other's. `planExpiresAt` stays the *plan's* expiry, null on Free.
- **The better-plan hint.** `GET /provider-profile/plan` answers `betterPlan` when a bigger
  plan, after dropping the add-ons it includes, would cost less than the plan plus the paid
  add-ons now (`betterPlanFor`, in USD list prices). The Plan tab offers the switch.
- **Not configured** — an add-on with no Paddle price is requested through the contact form
  (`topic: 'addonRequest'`) and granted on `/admin/providers`, the way a plan is.

## How a plan applies

- **`effectivePlan`** is the stored `Provider.plan`, or `free` once `planExpiresAt` has
  passed. It is computed on every read; nothing sweeps expired plans. An expiry therefore
  takes effect on the next request.
- **`getEntitlements(provider, now)`** returns the effective plan's limits and features with
  every live add-on on top. It is the only sanctioned way to gate anything — never read
  `Provider.plan` directly. Its input requires `addons`, so select `ENTITLEMENT_SELECT`: a
  select that forgets the add-ons fails to typecheck rather than ignoring what was paid for.
- **Two writers of `plan` and `planExpiresAt`, and of add-ons:** the Paddle webhook, and an
  admin on `/admin/providers`. Neither changes how they are read.
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
| Bookings a provider enters | `POST /provider-profile/bookings/import` | A batch that would pass the monthly cap → `403`, code `4104` (`PLAN_ERROR.bookingLimit`) — a plan answer, because the provider is the reader; the visitor-facing `4202` must never name a plan |
| Photo imports | `POST /provider-profile/bookings/import/parse` | Past `photoImportsPerDay` (Free: 1 per UTC day, paid: unlimited) → `403`, code `4103` (`PLAN_ERROR.photoImportLimit`). Counted in `PhotoImport` rows, spent before the Gemini call and given back if it fails. Metered because every read spends the deployment's one shared Gemini quota |
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
by compare-and-set, so concurrent bookings send once, and every writer of `plan` or of
add-ons clears them when the effective booking allowance changes (`planChangeStampReset`) —
the allowance, not the plan, because a pack of bookings raises it with no plan change.
**Not gated on notification preferences**, for the reason the approval-request email is not:
it is the only signal.

## Buying a plan or an add-on — the Paddle flow

The mechanics are regionify's, which has taken live payments in both Paddle environments:
a transaction created server-side with plain `fetch`, a page on our own domain that loads
Paddle.js, a hand-verified HMAC webhook, and localized prices from `/pricing-preview`.
Regionify sells one-time badges; Bookie extends the same flow to subscriptions.

**One subscription per provider, with several items**: at most one plan, plus any add-ons,
a pack carrying its count as the item's quantity. One renewal date, one invoice, one
`paddleSubscriptionId`.

1. **Upgrade** or **Add** on the Plan tab or `/pricing` calls `POST /billing/checkout` with a
   cart — a plan, add-ons, or both — and the locale (`useStartCheckout`). The API creates a
   Paddle transaction — the cart's prices, `custom_data.provider_id`, the provider's Paddle
   customer if they have one — with `checkout.url` set to `/<locale>/billing/checkout`. It
   refuses with `4302` (`alreadySubscribed`) while a subscription is live, and with `4304`
   (`addonIncluded`) for an add-on the plan already grants.
2. Paddle answers that URL with `?_ptxn=txn_…`; the client adds `?plan=` when the cart has
   one and navigates there. **`/billing/checkout` loads Paddle.js, which opens the overlay on
   seeing `_ptxn`** — Paddle Billing has no hosted checkout page. It is public: Paddle also
   links there from its own emails (a renewal to pay).
3. On `checkout.completed` the page goes to `/billing/return`, which polls
   `GET /provider-profile/plan` until **a subscription is live** (`useAwaitPlan` with
   `{ kind: 'subscribed' }`) — not the exact cart, because Paddle's overlay lets the buyer
   change a quantity or remove an item. It names the plan only when that plan is in force.
   On `checkout.closed` without a completion it goes back to the Plan tab. Paddle fires
   `checkout.closed` after `checkout.completed` too; `completedRef` keeps a paid checkout off
   the closed path.
4. Paddle creates the subscription and calls **`POST /billing/webhook`**, which writes `plan`,
   `planExpiresAt`, the billing columns and the `paddle` add-on rows. That webhook is the only
   writer of billing state; the routes above only ask Paddle for things.

Afterwards, from the Plan tab — every change **reads the subscription's items from Paddle**
(`GET /subscriptions/{id}`) and writes the whole list back, because Paddle removes whatever a
`PATCH` leaves out and our copy lags by one webhook. A per-provider in-process lock
(`lib/keyed-lock.ts`) keeps two quick clicks from undoing each other:

- **Switch** — `POST /billing/change-plan` replaces the plan item and drops the add-ons the
  new plan includes. `free` removes the plan item and keeps the add-ons; with none left that
  is a cancellation (`4305 lastItem`). Moving to a paid plan withdraws a pending cancellation.
- **Add-on** — `POST /billing/addon { addon, quantity }` sets one add-on's quantity; 0
  removes it. Buying withdraws a pending cancellation; removing leaves it in place. Without a
  subscription it answers `4303` and the web checks out instead.
- **Charged now, prorated** (`prorated_immediately`): an addition is charged for the rest of
  the period, a removal credited to the customer's balance. **Paddle refuses an immediate
  charge under 70¢** — a $1.99 add-on late in the month, a switch in a period's last day or
  two — so `lib/paddle.ts#updateSubscriptionItems` retries once with
  `prorated_next_billing_period`, and the change still goes through.
- **"Not right now"** — a renewal processing, another change pending, a failed payment, or
  Paddle's 20-an-hour / 100-a-day limit on immediate charges — answers `4306
  changeUnavailable` instead of a retryable 502.
- **Manage billing** — `POST /billing/portal` opens Paddle's customer portal: cancel, change
  the card, download invoices. The link carries a temporary token and is created per click.
  Cancelling there ends the plan and every add-on together.

When Paddle is **not configured** (no key, or no price for a plan or add-on — every fresh
clone), `GET /plans` and `GET /plans/addons` report it `purchasable: false` and the web falls
back to the contact-form request: *Request* sends `topic: 'planUpgrade'` or `'addonRequest'`,
and an admin grants it on `/admin/providers`.

**A provider with a live subscription cannot delete their page** (`DELETE /provider-profile`
→ `409`, `4307 activeSubscription`): Paddle would go on billing a page the webhook can no
longer find. Cancel first.

## Subscription state → plan

The webhook handles every `subscription.*` event the same way, because each carries the
whole subscription — every item (`services/billing.ts#subscriptionToSnapshot`):

| Subscription | `plan`, `paddle` add-on rows | Lapse (`planExpiresAt`, each row's `expiresAt`) |
|---|---|---|
| `active`, `trialing` | the items' | period end + 3 days (`RENEWAL_GRACE_DAYS`) |
| … with a cancellation or pause scheduled | the items' | exactly when it takes effect; `billingCancelsAt` set |
| `past_due` — a renewal failed, Paddle is retrying (dunning) | the items' | period start + 7 days (`PAST_DUE_GRACE_DAYS`) |
| `paused`, `canceled` | `free`, no add-ons | none |
| add-on items only | `free`, the add-ons | `planExpiresAt` null; the rows lapse as above |
| an item this deployment does not sell | ignored — logged; the rest applies | — |
| not one item it sells | unchanged — logged | unchanged |

Items are read with their `quantity` and `status` (an `inactive` item, which Paddle marks on
a paused subscription, grants nothing), and a pack's quantity is clamped to the catalogue's
maximum, so a Paddle price left at its default maximum of 100 cannot sell more.

So **dunning → grace → free**: a failed card keeps the plan for a week, the Plan tab says the
payment failed and offers Manage billing, and the plan returns as soon as Paddle collects.
The expiry is set whenever a subscription is live, so even if every later webhook were lost
the plan would lapse on its own a few days after the last period Paddle reported.

**Ordering and idempotency.** Paddle delivers at least once, in no guaranteed order.
`billingEventAt` holds the `occurred_at` of the last event applied; an older one is ignored.
An event for a *different* subscription is applied only when it is live and the stored one is
not (someone who cancelled and later subscribed again), so a late event from the old
subscription cannot cancel the new one. Re-applying a snapshot writes the same rows, which is
why there is no events table — and why the doubled deliveries of a webhook-secret rotation
are harmless. The provider's columns and its `paddle` add-on rows are written in **one
transaction, claimed by compare-and-set** on `billingEventAt`: two deliveries racing each
other could otherwise both pass the check and let the older snapshot commit last. The loser
re-reads and decides again, and if it keeps losing the webhook answers 500 so Paddle retries.

**Finding the provider.** By `paddleSubscriptionId` once known; else the subscription's
`custom_data.provider_id`; else the checkout transaction's own `custom_data`, read back from
Paddle — Paddle documents `custom_data` on the transaction and promises nothing about it on
the subscription it creates.

**Admin overrides.** `/admin/providers` still sets any provider's plan, but on a provider with
a live subscription the next webhook event overwrites it. The row shows a *Paddle* tag and
says so. Comp a plan on someone who does not pay through Paddle. Add-ons granted there are
`admin` rows, which the webhook never touches; the row lists the paid ones beside them.

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
| 5 — done | Add-ons: single features and capacity packs on one multi-item subscription, admin grants, the better-plan hint |
| 6 | The exact prorated amount in the add-on and switch confirms (`PATCH /subscriptions/{id}/preview`) |

Dropped, deliberately: **SMS** (email and Telegram cover it at no per-message cost),
**credits** (they existed to pay for SMS and paid placement) and **Featured placement on
Explore** (decided against). Credits were never meant for capacity either: a one-off $1
charge per extra service loses about a third to card fees and does not recur while hosting
does. Capacity is sold as **recurring packs** instead (*Add-ons*), on the same monthly
subscription and invoice as the plan, so no pack pays a transaction fee of its own at renewal.

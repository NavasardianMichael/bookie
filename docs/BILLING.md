# Billing — plans, limits and the road to payments

**Only providers pay.** Consumers never pay us for anything, never see an upsell, and never
hit an error because of a provider's plan. Booking, reviewing, favouriting and reading a
public page stay free for good.

Phase 1 is live: plans, limits, enforcement, admin assignment, the Plan tab and `/pricing`.
**There is no payment integration yet** — a paid plan is requested through the contact
form and assigned by hand. Paddle is the planned provider (Phase 2).

## The catalogue

The single source of truth is `PLAN_CATALOGUE` in
[`server/src/services/plans.ts`](../server/src/services/plans.ts). The numbers below are
today's placeholders; change them there and nowhere else — the web reads them from the API
(`GET /plans`, `personal.entitlements` on the owner profile) and holds no copy.

| | Free | Basic | Standard | Premium |
|---|---|---|---|---|
| Active services | 3 | 10 | 30 | unlimited |
| Online bookings a month | 50 | 300 | unlimited | unlimited |
| Analytics history | 30 days | 365 days | full | full |
| Custom `/p/<slug>` link | — | ✓ | ✓ | ✓ |

`null` means unlimited. Every limit must be non-decreasing from Free to Premium —
`tests/unit/server/plans.spec.ts` fails on an upgrade that takes something away.

## How a plan applies

- **`effectivePlan`** is the stored `Provider.plan`, or `free` once `planExpiresAt` has
  passed. It is computed on every read; nothing sweeps expired plans, because the API has no
  scheduler and must stay a single process. An expiry therefore takes effect on the next
  request.
- **`getEntitlements(provider, now)`** returns the effective plan's limits. It is the only
  sanctioned way to gate anything — never read `Provider.plan` directly.
- **Expiry is a last day, in UTC.** The admin picks the last day a plan covers; it ends at
  the UTC midnight after it (`src/helpers/plans.ts`). The booking month is the UTC calendar
  month for the same reason: `Provider` has no timezone column.

## Where each limit bites

| Limit | Where | What happens |
|---|---|---|
| Active services | `POST`/`PUT /providers/:id/services` | Creating an active service, or switching one on, past the cap → `403`, code `4101` (`PLAN_ERROR.serviceLimit`). The services page shows "N of M" and disables Add and the activate switches at the cap |
| Custom link | `PATCH /provider-profile/seo` | Setting or changing the slug without `customSlug` → `403`, code `4102`. Unchanged and cleared slugs always pass. The SEO tab makes the field read-only |
| Online bookings | `POST /appointments` | At the cap → `409`, code `4202` (`BOOKING_ERROR.bookingFull`). See *The soft cap* |
| Analytics history | `GET /provider-profile/analytics` | Clamped to `now − historyDays`; the previous-period delta is skipped if it would reach behind that. The tab disables the longer presets |

The codes live in import-free modules (`server/src/lib/plan-errors.ts`,
`server/src/lib/booking-errors.ts`), are mirrored in `src/constants/plans.ts` and
`src/constants/booking.ts`, and are pinned by `tests/unit/server/planErrors.spec.ts` and
`bookingErrors.spec.ts`. Their copy is `Errors.codes.*` in all 16 locales.

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

## Provider emails

At 80% and at 100% of the allowance the provider gets one email each per month
(`server/src/services/planNotices.ts`, sender `server/src/lib/plan-mail.ts`), linking to the
Plan tab. The 100% email also goes out when a booking is *refused* — that is what tells a
provider whose plan lapsed mid-month, already past the smaller Free allowance, that clients
are being turned away. The stamps (`bookingCapWarnedAt`, `bookingCapReachedAt`) are claimed
by compare-and-set, so concurrent bookings send once. **Not gated on notification
preferences**, for the reason the approval-request email is not: it is the only signal.

## Buying a plan today

1. The provider opens **Plan** (`/providers/profile/plan`) or `/pricing` and presses
   *Request upgrade* on a plan.
2. That sends the contact form with `topic: 'planUpgrade'` and the plan. The admin inbox
   reads `Plan upgrade request — basic — Anna Petrosyan`, with the provider id in the details.
3. An admin (an email in `ADMIN_EMAILS`) opens **`/admin/providers`**, finds the provider,
   sets the plan and optionally its last day. Changing the effective plan clears this
   month's notice stamps.

## Downgrades never take anything away from consumers

- Services above a new, lower cap stay live and editable; the provider just cannot add or
  reactivate one until they are under it.
- A slug set before custom links were paid keeps resolving and survives every SEO save; it
  only cannot be changed. `GET /providers/:idOrSlug` never consults the plan, so a printed
  link never breaks.
- Bookings are never cancelled by a plan change.

## Rollout

Every provider in production is on `free` until someone assigns otherwise, and the limits
apply the moment this ships: >3 active services, slug changes and older analytics close for
all of them. **Before or right after the deploy, give existing providers a grace plan** from
`/admin/providers` — for example Basic with a last day six months out.

## Roadmap

| Phase | Scope |
|---|---|
| 1 — done | Plans, entitlements, enforcement, admin assignment, Plan tab, `/pricing`, allowance emails |
| 2 | **Paddle.** Checkout, a webhook that writes `plan` and `planExpiresAt` (billing period end plus grace), Paddle customer and subscription id columns, the customer portal, dunning → grace → free. No read path changes: everything already goes through `getEntitlements` |
| 3 | What paid tiers sell: the reminder sender (the preference exists, no sender does), the `newBooking` provider email, an iCal feed, removing a "Powered by Bookie" badge |
| 4 | Credits, for things that cost us per unit: an append-only ledger, SMS reminders, labelled "Featured" placement on Explore |
| 5 | Team plans — needs Organization ownership, which does not exist (no User ↔ Organization link) |

Credits are deliberately not used for capacity. A $1 charge per extra service loses about a
third to card fees and does not recur while hosting does; capacity belongs in plans.

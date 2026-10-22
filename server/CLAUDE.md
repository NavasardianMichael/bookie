# Server — invariants

Express + Prisma + PostgreSQL, its own pnpm workspace package (`bookie-server`).
Schema and route reference: [docs/DATABASE_STRUCTURE.md](../docs/DATABASE_STRUCTURE.md).

```
server/
  prisma.config.ts   Prisma CLI config — schema path + migrate's seed command
  prisma/            schema.prisma, seed.ts
  src/
    app.ts           the only place routers are mounted
    index.ts         starts the server and the one background job (jobs/reminderJob)
    config.ts        the only reader of process.env (with load-env.ts)
    routes/          one router per resource
    services/        domain logic; the pure halves are unit-tested
    mappers/         Prisma -> frontend DTOs (entities.ts)
    middleware/      auth, error, csrf
    lib/             clients, codes, notices, small utilities
```

Modules worth knowing by name:

- **Pure, reachable from `tests/unit/server/`:** `services/plans.ts` (catalogue, add-ons,
  prices, every limit rule), `billing.ts` (Paddle items → plan + add-ons, item builders),
  `noticeRules.ts`, `reminders.ts`, `providerRelevance.ts`, `categories.ts`,
  `organizations.ts`, `profileAssistant.ts` (the assistant's prompt, schema, narrowing and
  service diff); `lib/paddle-signature.ts`, `assistant-errors.ts`, `ics.ts`, `telegram-updates.ts`,
  `notice-render.ts`, `return-path.ts`, `booking-errors.ts`, `error-response.ts`,
  `service-availability.ts`; `services/providerSeoFingerprint.ts` (what moves a provider
  page's sitemap `lastmod` — its I/O half is `providerSeoStamp.ts`).
  Their I/O halves (`billingSync`, `notify`, `bookingNotify`, `planUsage`, `exploreResults`)
  are not.
- **Twins of `src/` modules, kept identical by hand** (no import path between packages):
  `lib/search.ts` ↔ `src/helpers/search.ts`, `lib/time-format.ts` ↔ `src/helpers/timeFormat.ts`,
  `lib/time-zone.ts` ↔ `src/helpers/timeZone.ts`, `lib/payment.ts` ↔ `src/helpers/payment.ts`,
  `lib/password.ts` ↔ `src/helpers/password.ts`, `lib/category-names.ts` ↔ `Categories.names`,
  `lib/service-availability.ts` ↔ `src/helpers/serviceAvailability.ts` (which days a service is
  offered on; the server half refuses a booking outside them with `4203`).
- `lib/keyed-lock.ts` and `lib/rateLimit.ts` are **in-process** — a second API instance
  needs `pg_advisory_xact_lock` and Redis respectively.

## The response envelope is non-negotiable

Every JSON response, success or failure:

```json
{ "value": <T>, "error": null }
{ "value": null, "error": { "code": number, "message": string } }
```

Build it with the helpers in `src/lib/api-response.ts` — never hand-roll `res.json`. The
frontend's `Endpoint<>` contract in `src/interfaces/api.ts` depends on this shape.

A route raises what it means with `throw new HttpError(status, message, code?)` (or
`fail()` in the identity routes). Everything else reaching `middleware/error.ts` is mapped
by `lib/error-response.ts`: body-parser and multer errors → 400/413, Prisma `P2025` → 404,
`P2002`/`P2003` → 409, Prisma validation → 400, other `http-errors` 4xx keep their status,
anything else → 500, no matching route → 404. **The status matters more than the message**:
the client picks translated copy by status and code (`src/components/CLAUDE.md` → *Errors*).
Outside production the generic messages carry the original error. A handler that already
answered and then throws goes to Express's default handler (`res.headersSent`).

## Rules

- **ESM with explicit `.js` extensions on relative imports** (`./routes/providers.js`),
  even though the sources are `.ts`. Omitting it fails at runtime, not at compile time.
- Route mounting happens only in `app.ts`: a new resource is a router file plus one
  `app.use` line.
- Prisma shapes must not leak to the client — go through `src/mappers/entities.ts`.
- `optionalAuth` runs globally; per-route protection comes from `middleware/auth.ts`.
- Read `process.env` only in `src/config.ts`. Every module that reads it at module scope
  imports `./load-env.js` itself (`config.ts` and `lib/prisma.ts` do).
- **The API reads `server/.env` and nothing else.** `load-env.ts` hands `dotenv.config` one
  absolute path, so a `.development.local` / `.production.local` sibling is **never loaded
  by the running process** — those are deploy-payload staging files read only by
  `pnpm env:base64`. The web half *does* cascade, so identically named files behave
  differently in the two packages: a credential edited in the server's `.development.local`
  changes nothing (the symptom is e.g. the mail engine answering `403 Invalid API key`).
- **Prisma CLI config lives in `prisma.config.ts`**, which makes the CLI skip its implicit
  env loading — so the file imports `dotenv/config` itself. Remove that import and
  `prisma migrate deploy` runs with no `DATABASE_URL`.
- Production runs `node dist/src/index.js` (tsc output), never `tsx`.
  `scripts/build-api-release.mjs` builds the standalone release; `app.ts` sets
  `trust proxy` to 1 for the single nginx hop. See `docs/DEPLOYMENT.md`.
- Uploads are served at `/uploads` on the API origin as **root-relative** paths; the
  frontend prefixes them (`resolveAssetUrl`). Never return absolute URLs.

## The session cookie has to reach the *web* host too

Production serves `bookie.<domain>` and `api.bookie.<domain>`; dev serves both from
`localhost`, where cookies ignore ports. `src/proxy.ts` and Server Components on the web
host read `bookie_session` too, so a host-only API cookie works in dev and silently fails in
production (sign-in succeeds, every guarded route 307s back). `lib/session.ts` therefore
sets `Domain` from `config.cookieDomain`, which defaults in production to `CORS_ORIGIN`'s
hostname (the web host, which covers the API subdomain).

- **Do not widen it to the bare registrable domain** — it would put the session JWT on
  every sibling app.
- **`clearSessionCookie` must repeat the set attributes**, `Domain` included, or logout
  leaves the session alive. That is why the options live in one function.
- The Google OAuth cookies (`bookie_oauth`, `bookie_oauth_pending`) stay host-only.

## Email goes through the mail engine, and only from here

`src/lib/mail.ts` is the **only** client for the external mail engine and the only reader of
`MAIL_API_KEY`. Procedure and contract: the **`mail` skill**. Non-negotiables:

- **The frontend never calls the engine** — it posts to our API, which forwards.
- **The key never leaves `lib/mail.ts`** — not returned, logged, or put in an error.
- **`internal` reaches us, `external` reaches a user.** Never swap them.
- **Escape visitor-authored text before it reaches an HTML body** (`escapeHtml`).
- **A public route that sends must rate-limit at our edge first** (`lib/rateLimit.ts`).
- **Unconfigured is normal in dev, an outage in production**: log and succeed locally,
  `503` in production. `MailResult` never throws, so an ignored return value is a dropped
  email. A send that follows a committed write (booking mail, review report) logs and
  carries on — the row is the record.

**Contact messages are not persisted** (no `ContactMessage` table; the inbox is the system
of record), so `POST /contact` reports a failed send. **Review reports are persisted**
(`ReviewReport`, read by `/admin/reviews`), so their failed email does not fail the request,
and their rate limit is keyed on the provider id, not the IP.

## An emailed link has a reader, and the param name is the contract

Every link this server mails is read by a page in `src/app/`, with no shared type between
the packages — a mismatch typechecks and reaches the inbox, where the page reads
`undefined` and says the link expired. So: **mint the link in `lib/return-path.ts`, read
the param from `src/constants/auth.ts` / `ROUTES`, and pin the pair in a unit test.**

| Link | Minted by | Param / path | Read by | Pinned by |
|---|---|---|---|---|
| Signup verification, email change | `buildEmailVerifyUrl` | `EMAIL_VERIFY_QUERY` (`verifyEmail`) | `auth/verify-email`, `{providers,consumers}/profile` | `returnPath.spec.ts` |
| Password reset | `buildPasswordResetUrl` | `PASSWORD_RESET_QUERY` (`token`) | `auth/reset-password` | **inspection only** — see `docs/BACKLOG.md` |
| Booking approval request | `buildApprovalsUrl` | `PROVIDER_APPROVALS_PATH` | `profile/approvals` | `bookingErrors.spec.ts` |
| Booking allowance (80% / 100%) | `buildPlanUrl` | `PROVIDER_PLAN_PATH` | `profile/plan` | `planErrors.spec.ts` |
| Provider notices | `buildBookingsUrl` | `BOOKINGS_PATH` | `/bookings` | `billingErrors.spec.ts` |
| Declined / cancelled booker → provider page | `buildProviderPageUrl` | `PROVIDER_PAGE_PATH` (`/p/<slug ?? id>?lang=`, **no locale segment**) | `p/[slug]` | `returnPath.spec.ts` |
| Paddle checkout | `buildBillingCheckoutUrl` | `BILLING_CHECKOUT_PATH` (+ Paddle's `_ptxn`) | `billing/checkout` | `billingErrors.spec.ts` |

The two query names are **not** interchangeable — `TOKEN_QUERY` on a verification page is
the exact bug this prevents. A new link gets a row here and a pinned test, which means its
builder lives in a module a test can import. **`isAllowedEmailVerifyReturnPath` takes no
role**: it accepts either settings home, because a provider with a Consumer profile changes
their email from `/consumers/profile` (pinned by `returnPath.spec.ts`).

The same pin covers two more cross-package strings in `lib/booking-errors.ts` (an
import-free module, so the test can hold both sides): `BOOKING_ERROR` (`4201` paused, `4202`
full) against the web's `BOOKING_ERROR_CODES`, and `SLOT_TAKEN_MESSAGE` against
`src/helpers/booking.ts#isSlotTakenError`.

## Booking approval: the slot is held either way

`Provider.requiresBookingApproval` (default **false**) decides whether a booking lands as
`pending` or `scheduled`. Full table: `docs/DATABASE_STRUCTURE.md`.

- **`pending` is a live status.** `LIVE_STATUSES` (`services/appointments.ts`) is
  `['pending', 'scheduled', 'confirmed']`, read by both the overlap check and
  `getProviderBusyIntervals`, so the grid and the guard never disagree about "taken".
- **Approving writes `scheduled`, not a new state.** Declining writes `cancelled`.
- **Only `PATCH /provider-profile/bookings/:id/decision` moves a booking out of `pending`**
  — it sends the mail; `PATCH /appointments/:id` refuses it for the receiving provider with
  a 409. The *booker* can still cancel a pending booking.
- **The approval-request email is not gated on `emailNotificationPrefs.newBooking`** — it
  is what makes a decision happen at all.

`GET /providers/:id/busy` is the public read the grid subtracts: instants only (no id,
service or booker), window capped at 100 days.

## Plans — every limit goes through `getEntitlements`

`services/plans.ts` holds the catalogue and every rule (pure, `now` injected);
`services/planUsage.ts` counts and stamps; `services/planNotices.ts` sends the allowance
emails. Strategy: [docs/BILLING.md](../docs/BILLING.md).

- **Never read `Provider.plan` to gate a feature.** `getEntitlements(provider, now)` applies
  `planExpiresAt` and merges live add-ons (`ProviderAddon`). Select **`ENTITLEMENT_SELECT`**
  wherever a plan is enforced — a narrow `{ plan, planExpiresAt }` select fails to typecheck.
- **Nothing consumer-facing is ever withdrawn by a plan.** Over-cap services stay live
  (`takesServiceSlot` only blocks inactive → active), a grandfathered slug keeps resolving
  (`needsCustomSlug`). Block growth, never remove.
- **A visitor is never told about a plan.** A spent allowance answers
  `BOOKING_ERROR.bookingFull` and a plan-neutral `details.onlineBooking: 'full'`; the public
  payload carries no plan, limit or count (`mappers.spec.ts`).
- **The booking allowance is a soft cap** — an overshoot of one under a simultaneous submit
  is accepted.
- The allowance emails are **not gated on `emailNotificationPrefs`** and are sent
  fire-and-forget after the booking route answers.

## Billing — the webhook is the only writer of billing state

`routes/billing.ts` only *asks* Paddle (checkout, switch, add-on change, portal link). What a
provider holds — `plan`, `planExpiresAt`, the `paddle` `ProviderAddon` rows — is written by
`POST /billing/webhook` alone, through `services/billingSync.ts`, from the subscription
snapshot every `subscription.*` event carries. Out-of-order and repeated events are handled
by compare-and-set on `billingEventAt` in one transaction — no events table.

A change reads the items **from Paddle**, never from our copy, and `PATCH`es the whole list
back (Paddle removes what is left out) inside `billingLock`. The item builders keep an
existing item's own price id and pass unknown items through. Full state table:
`docs/BILLING.md`.

## Webhooks are mounted before the JSON parser and `requireSameOrigin`

`POST /billing/webhook` (Paddle) and `POST /telegram/webhook` are the only server-to-server
routes. `app.ts` mounts both **ahead of** `express.json()` and `requireSameOrigin`:

- **Paddle signs the raw bytes** — its route gets `express.raw`. `lib/paddle-signature.ts`
  accepts every secret in `PADDLE_WEBHOOK_SECRET`, so a rotation can run two destinations.
- **Neither sends `Origin`/`Referer`**; each authenticates with the HMAC or the bot's secret
  token instead.
- **Answer 2xx to anything we cannot act on**, 5xx only when applying failed on our side.

Do not move them below the parser, and do not add a third webhook anywhere else.

## Third-party secrets each have one reader

One module reads each credential from `config` and never returns, logs or puts it in an
error: `MAIL_API_KEY` → `lib/mail.ts`, `PADDLE_API_KEY` → `lib/paddle.ts`,
`TELEGRAM_BOT_TOKEN` → `lib/telegram.ts` (it is in every request URL — log Telegram's
description, never the URL), `GOOGLE_CLIENT_SECRET` → `lib/google-oauth.ts`,
`GEMINI_API_KEY` → `lib/gemini.ts` (sent as the `x-goog-api-key` header). Each is empty in a
fresh clone and the feature reports itself unavailable (`isPaddleConfigured()`,
`isTelegramConfigured()`, `isGeminiConfigured()`, `/health`) rather than throwing. Google
sign-in without credentials redirects back with `?error=google_unavailable`.

A photo sent to Gemini is held **in memory only** (`multer.memoryStorage()` in
`routes/bookingImport.ts`) — never under `config.uploadDir`, which `/uploads` serves. The
profile assistant's description is never stored either; only a `ProfileAssistantRun` row
records that a draft was made. Both features map Gemini's failures through
`lib/gemini-errors.ts#toGeminiHttpError`, each with its own words and codes.

## Notifications

`services/noticeRules.ts#channelsFor` decides who gets which channel;
`services/bookingNotify.ts` sends every booking notice. A provider's own Telegram needs the
plan's `telegramNotifications`; a client's never depends on a plan. **Every notice is
best-effort** — the booking is committed. No SMS. See `docs/NOTIFICATIONS.md`.

**The reminder job is the API's one background job** (`jobs/reminderJob.ts`), started by
`index.ts`, never by `createApp`. Everything else is computed on read. It claims each send
by compare-and-set on `Appointment.providerRemindedAt` / `bookerRemindedAt`, so it is
at-most-once. **Code that moves a booking to a new time must clear both stamps**, as
`rescheduleAppointment` does.

## `/admin/*`

`routes/admin.ts`, behind `requireAdmin`: review moderation, plan assignment
(`PATCH /admin/providers/:id/plan`) and add-on grants (`PATCH /admin/providers/:id/addons`,
`admin` rows only — the webhook never touches them, this route never touches `paddle` ones).
The webhook overwrites a manual plan on a provider with a live subscription. Plan and
add-on writes are logged with the acting `userId` (no audit table).

- **Admin is not a role.** It is the identity email appearing in `ADMIN_EMAILS`, re-read
  from the `User` row per request. An empty allowlist admits nobody, checked explicitly.
- **It answers 404, never 403** — a 403 confirms the surface exists.
- **Hiding a review is a `hiddenAt` timestamp, never a delete**, and recomputes the
  provider's aggregate in the same transaction.

## Consumer data is never public

There is no public consumer read. `consumerProfileRouter` runs on **`requireAuth`** and
derives the row from `session.userId` — never a parameter — so the only record any caller
can reach is their own. That is what lets a provider who also booked as a client reach
their own consumer settings. `requireProvider` stays for provider capabilities.

**`GET /provider-profile/bookings` returns the booker's name, phone and email** — a
deliberate widening: the provider id comes off `req.session.profileId`, so it reaches only
the provider those appointments belong to. Those fields live in `mapProviderBooking`
(`mappers/entities.ts`) and **nowhere else** — not `GET /appointments`, `mapConsumer`,
`mapConsumerSideBooking`, or any route keyed on a consumer id. The provider list's name
search matches `guestEmail` but **not** a consumer's email, so a provider cannot probe which
addresses hold accounts.

## The seed must stay idempotent

`pnpm install` runs `scripts/postinstall.mjs`, which migrates *and* seeds, so the seed
re-runs against the previous run's rows. Local seeded accounts use the password
`bookie-dev-1234` (`docs/DEV_CREDS.md`).

| Model | What makes it re-runnable |
|---|---|
| User, Category | `upsert` on a unique key (`email`, `name`) |
| Provider, Consumer | `upsert` on `userId`, with `update: {}` |
| Organization | `findFirst` on `name` — **no** unique constraint |
| Appointment, Review | `findFirst` on the identifying columns — no unique key |
| FavoriteProvider | `createMany({ skipDuplicates: true })` on `(userId, providerId)` |

Use `upsert` only where a unique constraint exists; a plain `create` on the others
duplicates them. `update: {}` is deliberate, so editing `providerDefs` does not refresh an
existing provider — delete the row or run `npx prisma migrate reset` in `server/`. The seed
ends by calling `recomputeProviderRating` for every provider, unconditionally.

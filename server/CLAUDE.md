# Server — invariants

Express + Prisma + PostgreSQL, its own pnpm workspace package (`bookie-server`).
Schema and route reference: [docs/DATABASE_STRUCTURE.md](../docs/DATABASE_STRUCTURE.md).

```
server/
  prisma.config.ts          Prisma CLI config — schema path + migrate's seed command
  prisma/schema.prisma, seed.ts
  src/
    app.ts, index.ts, config.ts, load-env.ts
    routes/       Express routers, one per resource
    services/     appointments + availability logic, Explore's provider query
    mappers/      Prisma -> frontend DTOs
    middleware/   auth, error
    lib/          api-response, auth-notices, booking-mail, cookie-domain, email-verify,
                  google-oauth, mail, oauth-state, password, password-reset, payment, prisma,
                  rateLimit, request, return-path, review-mail, session, token
```

## The response envelope is non-negotiable

Every JSON response, success or failure:

```json
{ "value": <T>, "error": null }
{ "value": null, "error": { "code": number, "message": string } }
```

Build it with the helpers in `src/lib/api-response.ts` — never hand-roll `res.json`.
The frontend's `Endpoint<>` contract in `src/interfaces/api.ts` depends on this shape.

## Rules

- **ESM with explicit `.js` extensions on relative imports** (`./routes/providers.js`),
  even though the sources are `.ts`. This is a hard requirement of the module setup —
  omitting the extension fails at runtime, not at compile time.
- Route mounting happens only in `app.ts`. A new resource means a new router file plus
  one `app.use` line.
- Prisma shapes must not leak to the client — go through `src/mappers/entities.ts`.
- `optionalAuth` runs globally; per-route protection comes from `middleware/auth.ts`.
- Config is centralised in `src/config.ts` with defaults. Read `process.env` there, not
  scattered through routes. Every module that reads `process.env` at module scope must
  import `./load-env.js` itself — `config.ts` and `lib/prisma.ts` do. It resolves the
  server's own env file by path, so `pnpm watch` (cwd = repo root) cannot leave Prisma
  pointed at the Next.js env.
- **Prisma CLI config lives in `prisma.config.ts`**, not in a `prisma` block in
  `package.json` — that block is deprecated in Prisma 6.19 and gone in 7. A config file
  makes the CLI skip its implicit env loading ("Prisma config detected, skipping
  environment variable loading"), which is why the file imports `dotenv/config` itself.
  Remove that import and `prisma migrate deploy` runs with no `DATABASE_URL`.

## The session cookie has to reach the *web* host too

Production serves the two halves from different hosts — `bookie.<domain>` and
`api.bookie.<domain>` — while local dev serves both from `localhost`, where `:7004` and
`:9004` differ only by a port and cookies ignore ports.

So a **host-only cookie is same-host in dev and cross-host in production**, and this one is
not only read by the API. `src/proxy.ts` guards every signed-in route on the web host by
checking `bookie_session` is merely *present*; Server Components forward the request's
cookies to the API (`app/[lang]/providers/[providerId]/page.tsx`). Both live on
`bookie.<domain>` and see nothing without a `Domain`.

That shipped: sign-in succeeded, the client believed it held a session because its XHRs to
`api.` did carry the cookie, and the first navigation to a guarded route 307'd back to
sign-in. Nothing reproduced locally and the API was healthy throughout.

`lib/session.ts` therefore sets `Domain` from `config.cookieDomain`, which defaults in
production to **`CORS_ORIGIN`'s hostname** — the web host, which covers its own subdomains
and so covers the API. Two things follow:

- **Do not widen it to the bare registrable domain.** `.mnavasardian.com` would put this
  session JWT on every request to every sibling app, `api-mail-engine` included.
- **`clearSessionCookie` must keep repeating the set attributes.** A browser overwrites a
  cookie only when name, path *and domain* all match, so a logout that forgets `Domain`
  leaves the session alive. The options are factored into one function for this reason.

The Google OAuth cookies (`bookie_oauth`, `bookie_oauth_pending`) stay host-only on
purpose: they are set and read by this API alone, within `/identity/google`.

## Email goes through the mail engine, and only from here

`src/lib/mail.ts` is the **only** client for the external mail engine and the only module
that reads `MAIL_API_KEY`. Procedure, request contract and worked examples are in the
**`mail` skill** (`.claude/skills/mail/SKILL.md`); the non-negotiables are here because
this file loads whenever you touch `server/`:

- **The frontend never calls the engine.** `src/` has no key and adding one would ship it
  to the browser. The client posts to our API, which forwards — that is the whole reason
  `POST /contact` exists rather than the form calling out directly.
- **The key never leaves `lib/mail.ts`.** Not returned, not put in an error, not logged. A
  failed send logs the status and the engine's own message, never the request headers.
- **`internal` reaches us, `external` reaches a user.** `/mail/internal/send` takes no
  `to` at all — the engine owns the admin address — so it cannot be aimed. Never use it to
  mail a user, or `external` to mail ourselves.
- **Escape visitor-authored text before it reaches an HTML body** (`escapeHtml`). The
  engine's DOMPurify pass stops scripts, not an `<a href>` or `<img>` someone typed.
- **A public route that sends must rate-limit at our edge first.** The engine's 10/minute
  is per IP *as it sees them*, and it only sees this server — so all traffic shares one
  bucket with transactional mail. `lib/rateLimit.ts`, in-memory and per-process: move it
  to Redis before running a second API instance.
- **An unconfigured engine is normal in dev and an outage in production.** `.env.example`
  ships an empty `MAIL_API_KEY`, so `isMailConfigured()` is false locally; log and succeed
  there, `503` in production. `MailResult` never throws, so an ignored return value is a
  silently dropped email. Booking confirmation and reschedule notify (`lib/booking-mail.ts`)
  **must** ignore a failure: the appointment is already saved; create returns
  `emailSent: false`, reschedule still `200`.

**Contact messages are not persisted, deliberately.** `POST /contact` validates,
honeypots, rate-limits and forwards — there is no `ContactMessage` table. The admin inbox
is the system of record; a table would duplicate it, hold name/email/free-text PII with no
retention policy, and never be read while there is no admin surface. That is also why the
route reports a failed send instead of banking the message silently.

**Review reports *are* persisted, and the difference is the reader.** `POST /reviews/:id/report`
writes a `ReviewReport` row *and* emails us. That is not a change of heart about the rule
above — it is the rule applied to a case where its premise no longer holds. The argument
against a `ContactMessage` table turned on there being no admin surface to read it;
`/admin/reviews` is that surface, and it has to know which reports are still open. So the
email is the alert and the row is the queue.

Two consequences follow, and both are the opposite of `contact.ts`:

- **A failed send does not fail the request.** The row is already committed and the queue
  already has it, so `lib/review-mail.ts` logs and returns `void` — there is no outcome a
  caller should branch on. Contact surfaces its failure because it has nothing to fall
  back on. Same bargain `lib/booking-mail.ts` makes with a confirmed booking.
- **The rate limiter is keyed on the provider id, not the IP.** The route is
  authenticated, so there is a stable identity to count against — and that identity is
  exactly what is being abused when someone tries to bury a page's reviews under reports.
  An IP key would let one provider spend everyone else's budget from a shared network.

## An emailed link has a reader, and the param name is the contract

Every link this server mails is consumed by a page in `src/app/`, and the two halves live in
different packages with no shared type between them. Nothing catches a disagreement: the
query param is a string on one side and a string on the other, so a mismatch typechecks,
lints, builds, and reaches the inbox — where the page reads `undefined` and tells the
visitor their link expired. That shipped once, on signup verification.

So: **mint the param from `lib/return-path.ts` and read it from `src/constants/auth.ts`, and
keep the pair pinned by a test.**

| Link | Minted by | Param | Read by |
|---|---|---|---|
| Signup verification | `buildEmailVerifyUrl` | `EMAIL_VERIFY_QUERY` (`verifyEmail`) | `app/[lang]/auth/verify-email` |
| Email change | `buildEmailVerifyUrl` | `EMAIL_VERIFY_QUERY` (`verifyEmail`) | `app/[lang]/{providers,consumers}/profile` |
| Password reset | `buildPasswordResetUrl` | `PASSWORD_RESET_QUERY` (`token`) | `app/[lang]/auth/reset-password` |

The two names are **not** interchangeable, which is the trap — reaching for `TOKEN_QUERY` on a
verification page is the exact bug above.

`buildEmailVerifyUrl` and `EMAIL_VERIFY_QUERY` were moved into `lib/return-path.ts` (and are
re-exported from `lib/email-verify.ts`, so call sites did not change) for one reason: that
module imports nothing but `lib/request.ts`, which makes it the only half of the pair a test
can reach. `tests/unit/server/returnPath.spec.ts` imports the server constant and the web one
side by side and asserts they are equal, so renaming either alone now fails there.

`buildPasswordResetUrl` is **not** pinned that way — `lib/password-reset.ts` imports config,
Prisma and the mail client, so no unit test can reach it. The reset pair agrees today and is
held only by inspection; see `docs/BACKLOG.md`. When you add a link, add its row here and
give it a pinned test, which means putting the builder somewhere a test can import.

## `/admin/*` — the one admin surface

`routes/admin.ts`, behind `requireAdmin` (`middleware/auth.ts`). Three routes, all about
moderating reviews: list reports, hide/restore a review, close a report.

- **Admin is not a role.** `SessionPayload.role` is only `consumer | provider`; an admin
  signs in with whichever account they already have and is recognised by their identity
  email appearing in `config.adminEmails` (`ADMIN_EMAILS`, comma-separated). The email is
  re-read from the `User` row per request, so removing someone takes effect on their next
  request rather than when their 7-day cookie expires. A column would have meant a
  `SessionPayload` change and a claim that grants access without a second look at the
  database.
- **An empty allowlist admits nobody**, checked explicitly rather than relying on
  `[].includes()` — true today, one refactor away from not being.
- **It answers 404, never 403.** A 403 confirms the surface exists and that the account
  merely lacks the grant, which is the first useful thing to learn before attacking it.
  `/routes-overview` excludes the route for the same reason (`src/constants/header.ts`).
- **Hiding is a `hiddenAt` timestamp, never a delete**, and it recomputes the provider's
  aggregate in the same transaction — a review removed for abuse must stop dragging the
  score it was written to damage, and a wrongly hidden one has to be restorable.

## Production

`pnpm build` (tsc) emits `dist/`, and production runs `node dist/src/index.js` — not `tsx`,
which is a dev-only dependency. `scripts/build-api-release.mjs` turns `dist/` + `prisma/`
into a standalone single-package release that installs its own dependencies on the host;
its header explains why the API cannot ship as a workspace slice. `app.ts` sets
`trust proxy` to 1 for the single nginx hop, and `HOST=127.0.0.1` keeps the listener off
every public interface. Procedure: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

## Local stack

```bash
cp server/.env.example server/.env   # placeholders; matches docker-compose creds
pnpm db:up                            # needs Docker Desktop
pnpm db:setup                         # migrate + seed
pnpm watch                            # web :7004 + api :9004
```

Every **local** seeded account signs in with the password `bookie-dev-1234`, hashed by
`lib/password.ts` exactly as registration does. Emails and the rest are in
[docs/DEV_CREDS.md](../docs/DEV_CREDS.md). The seed also creates one Google-only consumer
(`gohar.nazaryan@bookie.am`) with an email and a fake `googleId` and no password — email
is required on that row too.

Google sign-in stays disabled until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
`GOOGLE_REDIRECT_URI` are set; `GET /health` reports `{ google: false }` and
`GET /identity/google` redirects back with `?error=google_unavailable` rather than failing.

Uploads are served from the API's own origin at `/uploads`. The API returns
root-relative paths, so the frontend must prefix them — that is what
`src/helpers/images.ts#resolveAssetUrl` does. Do not return absolute URLs from here.

## The seed must stay idempotent

`pnpm install` runs `scripts/postinstall.mjs`, which migrates *and* seeds. So the seed
re-runs on every install, against a database that already holds the previous run's rows.
Every write in `prisma/seed.ts` has to tolerate that:

| Model | What makes it re-runnable |
|---|---|
| User, Category | `upsert` on a unique key (`email`, `name`) |
| Provider, Consumer | `upsert` on `userId`, with `update: {}` |
| Organization | `findFirst` on `name` — that column has **no** unique constraint |
| Appointment, Review | `findFirst` on the identifying columns — neither has a unique key |

`Review` seeding is a `reviewDefs[]` loop guarded by `findFirst` on the consumer/provider
pair, and the seed ends by calling `recomputeProviderRating` for every provider. That last
step is unconditional on purpose: the migration backfills the aggregates once, but a
developer who edits `reviewDefs` or deletes a row by hand needs the four denormalised
columns to follow, and one aggregate per provider on a seed run costs nothing.

Reach for `upsert` only where a unique constraint actually exists; the other three models
have none, so a plain `create` is what duplicates them. `update: {}` is deliberate — a
re-run must not duplicate a provider's nested `services` or overwrite rows edited while
developing. The cost is that editing `providerDefs` does not refresh a provider that
already exists; delete the row or run `npx prisma migrate reset` in `server/`.

Two bugs this section exists to prevent, both fixed: `provider.create` threw `P2002` on
`Provider.userId` on every install after the first, and `organization.create` silently
appended another eight organizations per run — no error, just a growing table.

## Consumers are never public

`GET /consumers` and `GET /consumers/:id` used to be mounted unauthenticated and returned
every consumer's name and phone number to anyone who asked. Nothing in the app called them.
They are gone, and `consumersRouter` no longer exists — only `consumerProfileRouter`, behind
`requireConsumer`, which scopes every read and write to the caller's own record.

If a provider ever needs to see who booked them, that belongs on the appointment and scoped
to that provider, not on a lookup keyed by a guessable id.

### …and that is exactly what `GET /provider-profile/bookings` is

It returns the booking consumer's **name, phone and email**, which `GET /appointments`
does not. That is a deliberate widening, taken under the rule above rather than around it:

- **Why it exists.** A day's client list that cannot be phoned is not a client list. Guest
  bookings already carry the same four fields, so withholding them for signed-in consumers
  made the provider's calendar arbitrarily less useful for their *better* customers.
- **What bounds it.** The route is on `providerProfileRouter` behind `requireProvider`, and
  the provider id comes off `req.session.profileId` — it is never a parameter, so there is
  no id to tamper with and no way to aim it at another provider's calendar. The contact
  details reach only the provider those appointments belong to.
- **Where it is allowed to live.** `mapProviderBooking` in `mappers/entities.ts`, and
  nowhere else. Do not add these fields to `GET /appointments`, to `mapConsumer`, to
  `mapConsumerSideBooking`, or to any route keyed on a consumer id. The consumer-side
  workspace list names the *other* provider and must not carry their phone or email.
  A search by name on the receiving-provider list deliberately matches `guestEmail` but
  **not** a consumer's email, so a provider cannot probe for which addresses hold accounts.

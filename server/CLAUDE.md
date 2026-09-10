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
    lib/          api-response, email-verify, mail, otp, prisma, rateLimit, request, session
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
  silently dropped email.

**Contact messages are not persisted, deliberately.** `POST /contact` validates,
honeypots, rate-limits and forwards — there is no `ContactMessage` table. The admin inbox
is the system of record; a table would duplicate it, hold name/email/free-text PII with no
retention policy, and never be read while there is no admin surface. That is also why the
route reports a failed send instead of banking the message silently.

## Local stack

```bash
cp server/.env.example server/.env   # placeholders; matches docker-compose creds
pnpm db:up                            # needs Docker Desktop
pnpm db:setup                         # migrate + seed
pnpm watch                            # web :4141 + api :4142
```

Every seeded account signs in with the password `bookie-dev-1234`, hashed by
`lib/password.ts` exactly as registration does. Emails and the rest are in
[docs/DEV_CREDS.md](../docs/DEV_CREDS.md).

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
| User, Category | `upsert` on a unique key (`phoneCode_phoneNumber`, `name`) |
| Provider, Consumer | `upsert` on `userId`, with `update: {}` |
| Organization | `findFirst` on `name` — that column has **no** unique constraint |
| Appointment, Review | `findFirst` on the identifying columns — neither has a unique key |

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
  nowhere else. Do not add these fields to `GET /appointments`, to `mapConsumer`, or to any
  route keyed on a consumer id. A search by name deliberately matches `guestEmail` but
  **not** a consumer's email, so a provider cannot probe for which addresses hold accounts.

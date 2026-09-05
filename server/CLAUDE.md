# Server — invariants

Express + Prisma + PostgreSQL, its own pnpm workspace package (`bookie-server`).
Schema and route reference: [docs/DATABASE_STRUCTURE.md](../docs/DATABASE_STRUCTURE.md).

```
server/
  prisma/schema.prisma, seed.ts
  src/
    app.ts, index.ts, config.ts, load-env.ts
    routes/       Express routers, one per resource
    services/     appointments + availability logic
    mappers/      Prisma -> frontend DTOs
    middleware/   auth, error
    lib/          api-response, otp, prisma, session
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

## Local stack

```bash
cp server/.env.example server/.env   # placeholders; matches docker-compose creds
pnpm db:up                            # needs Docker Desktop
pnpm db:setup                         # migrate + seed
pnpm watch                            # web :4141 + api :4142
```

Dev OTP is `123456` for all phones (`config.devOtpBypass`). Seeded accounts are in
[docs/DEV_CREDS.md](../docs/DEV_CREDS.md).

Uploads are served from the API's own origin at `/uploads`. The API returns
root-relative paths, so the frontend must prefix them — that is what
`src/helpers/images.ts#resolveAssetUrl` does. Do not return absolute URLs from here.

## Consumers are never public

`GET /consumers` and `GET /consumers/:id` used to be mounted unauthenticated and returned
every consumer's name and phone number to anyone who asked. Nothing in the app called them.
They are gone, and `consumersRouter` no longer exists — only `consumerProfileRouter`, behind
`requireConsumer`, which scopes every read and write to the caller's own record.

If a provider ever needs to see who booked them, that belongs on the appointment and scoped
to that provider, not on a lookup keyed by a guessable id.

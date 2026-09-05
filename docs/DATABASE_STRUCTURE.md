# Bookie — Database & API

PostgreSQL schema managed by Prisma in [`server/prisma/schema.prisma`](../server/prisma/schema.prisma).

## Core models

| Model | Purpose |
| --- | --- |
| **User** | Phone identity (`phoneCode` + `phoneNumber`), OTP fields, optional 1:1 Consumer/Provider |
| **Category** | Service specialty (unique name) |
| **Organization** | Clinic / facility; M2M with Category |
| **Provider** | Professional profile, `weekSchedule` JSON, plan, optional organization |
| **Service** | Bookable offering (duration, price, category) |
| **Consumer** | Patient/client profile — `firstName` + `lastName` stored separately, optional `email`, optional `country` |
| **FavoriteProvider** | Consumer ↔ Provider favorites |
| **Appointment** | Booking with status enum and overlap index |
| **Review** | Rating 1–5 for provider and/or organization |

## Relationships

```
Consumer ←→ Appointment ←→ Provider
    ↓           ↓           ↓
  Review      Service    Organization
                ↑
            Category
```

## API envelope

All JSON responses use:

```json
{ "value": <T>, "error": null }
{ "value": null, "error": { "code": number, "message": string } }
```

## Routes (Express, default `:4142`)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/health` | public |
| POST | `/identity/send-otp` | public |
| POST | `/identity/login` | public (sets httpOnly cookie) |
| GET | `/identity/me` | session |
| POST | `/identity/logout` | session |
| GET | `/providers`, `/providers/:id` | public |
| GET | `/providers/:id/availability?date=` | public |
| GET/PUT | `/provider-profile` | provider |
| POST/PUT/DELETE | `/providers/:providerId/services/...` | provider |
| GET | `/organizations?q=`, `/organizations/:id` | public |
| GET | `/categories`, `/categories/:id` | public |
| GET | `/consumers`, `/consumers/:id` | public |
| GET/PUT | `/consumer-profile` | consumer |
| GET/POST/PATCH | `/appointments` | session |

`GET /organizations` returns the full list; `?q=` filters by name (case-insensitive
`contains`, capped at 20) and backs the provider registration form's Organization combobox.

## Registration and sign-in

**`POST /identity/login` is both.** There is no separate register endpoint — the account is
created lazily on the first OTP that verifies.

```jsonc
// Request. `phone` is an object, never a formatted string.
{
  "phone": { "code": 374, "number": 77000201 },
  "otp": "123456",
  // Sent by a registration form. OMITTED at sign-in, where the server reads the role off
  // whichever profile already exists (provider wins if a user somehow has both).
  "userType": "provider",
  // Applied ON CREATE ONLY — a returning user's profile is never overwritten.
  "profile": {
    "firstName": "Alex",
    "lastName": "Morgan",
    "email": "alex@company.com",
    // Provider only, mutually exclusive: an id links an existing organization, a name
    // matches one case-insensitively or creates it.
    "organizationId": "…",
    "organizationName": "Acme Services"
  }
}
```

```jsonc
// Response value. `role` decides which onboarding the frontend enters; `isNewUser`
// distinguishes a fresh account from a returning sign-in.
{ "role": "provider", "profileId": "…", "isNewUser": true }
```

A phone number with no account and no `userType` gets `404` — sign-in cannot silently
create a profile of a guessed role.

`GET /identity/me` returns `{ role, profileId }` from the session cookie, which is how the
client recovers its role after a refresh (the cookie is httpOnly).

## Local setup

1. Copy env: `cp server/.env.example server/.env`
2. Run `pnpm install` — generates Prisma client; applies migrations and seed when Postgres is up
3. Start Postgres if needed: `pnpm db:up` (requires Docker Desktop), then `pnpm db:setup`
4. Run API + web: `pnpm watch`
5. Frontend env: copy `.env.example` → `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4142`

**Dev login:** see [DEV_CREDS.md](DEV_CREDS.md) for seeded provider/consumer phones and OTP.

## Project layout

```
server/
  prisma/schema.prisma
  prisma/seed.ts
  src/
    app.ts, index.ts
    routes/       # Express routers
    services/     # Appointments, availability
    mappers/      # Prisma → frontend DTOs
    middleware/   # Auth, errors
docker-compose.yml
```

## Country columns are ISO codes, not names

`Provider.country`, `Consumer.country` and `Organization.country` hold **ISO 3166-1
alpha-2** (`AM`, `DE`), captured from the country picked on the phone field at
registration.

Two reasons it is a code rather than a display name:

- **It has to render in 15 languages.** `Intl.DisplayNames` turns one stored `DE` into
  Germany, Deutschland, ألمانيا or ドイツ. A stored English name would pin every profile's
  country to English no matter what language the page is in. `src/helpers/country.ts`
  does the rendering and passes non-code values through unchanged, so rows written before
  this convention still read correctly.
- **It cannot be derived from the dialling code** already on `User.phoneCode`: +1 is the
  US, Canada and ~20 more; +7 is Russia and Kazakhstan. The selection at registration is
  the only place the real answer exists.

Nullable on both profile tables and deliberately not backfilled — a wrong country is worse
than a missing one.

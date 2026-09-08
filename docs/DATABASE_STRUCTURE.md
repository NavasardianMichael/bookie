# Bookie — Database & API

PostgreSQL schema managed by Prisma in [`server/prisma/schema.prisma`](../server/prisma/schema.prisma).

## Core models

| Model | Purpose |
| --- | --- |
| **User** | Phone identity (`phoneCode` + `phoneNumber`), OTP fields, pending phone OTP and pending email-verify token, optional 1:1 Consumer/Provider |
| **Category** | Service specialty (unique name) |
| **Organization** | Clinic / facility; M2M with Category |
| **Provider** | Professional profile, `weekSchedule` JSON, plan, optional organization, `listed`/`draft` for publish flow, email prefs + payment info |
| **Service** | Bookable offering (duration, price, category) |
| **Consumer** | Patient/client profile — `firstName` + `lastName`, optional `description`/`email`, email prefs + payment info |
| **FavoriteProvider** | Consumer ↔ Provider favorites |
| **Appointment** | Booking with status enum and overlap index. `consumerId` is **nullable** — a guest booking carries `guest*` contact columns instead |
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
| GET | `/identity/me` | session — `{ role, profileId, firstName, lastName, image? }` |
| POST | `/identity/logout` | session |
| POST | `/identity/change-phone/send-otp` | session |
| POST | `/identity/change-phone/confirm` | session |
| POST | `/identity/change-email/send` | session — `{ email, returnPath }`; emails a link (dev: API console) |
| POST | `/identity/change-email/confirm` | session — `{ token }` from the profile URL's `verifyEmail` query |
| GET | `/providers?q=&categoryId=&available=&bookable=&sort=&page=&perPage=` | public (`listed: true` only) — **paged**, see below |
| GET | `/providers/:id` | public (owner may preview unlisted) |
| GET | `/providers/:id/availability?date=` | public |
| GET/PUT/DELETE | `/provider-profile` | provider (`mode`: draft / publish / listing / live; DELETE removes the page) |
| POST/PUT/DELETE | `/providers/:providerId/services/...` | provider (own services only) |
| GET | `/organizations?q=`, `/organizations/:id` | public |
| GET | `/categories`, `/categories/:id` | public |
| POST | `/contact` | public — contact form; forwards to the mail engine, **stores nothing** |
| GET/PUT | `/consumer-profile` | consumer |
| GET/PATCH | `/appointments` | session (list includes `provider` + `service`, and `consumer` **or** `guest`) |
| POST | `/appointments` | **public** — see [Booking](#booking) |

There is **no public consumer directory**. `GET /consumers` and `GET /consumers/:id` were removed.

`POST /contact` has **no table behind it**, on purpose. It validates
`{ firstName, lastName, email?, message, website? }`, drops anything with the `website`
honeypot filled in, rate-limits 5/hour per IP, then forwards to the mail engine's
`/mail/internal/send`. The admin inbox is the system of record — a `ContactMessage` table
would duplicate it and hold free-text PII with no retention policy or reader. A failed
send is therefore reported to the sender (`502`, or `429` passed through) rather than
banked silently. See the `mail` skill and `server/CLAUDE.md`.

`GET /organizations` returns the full list; `?q=` filters by name (case-insensitive
`contains`, capped at 20) and backs the provider registration form's Organization combobox.

### Provider list — the Explore query

`GET /providers` is the only paged endpoint. It answers with a window, not an array:

```json
{ "value": { "items": [BasicProvider], "total": 42, "page": 2, "perPage": 9, "pageCount": 5 }, "error": null }
```

| Param | Accepts | Default |
| --- | --- | --- |
| `q` | free text, split on whitespace into at most 5 terms | — |
| `categoryId` | a `Category.id` | — |
| `available` | `true` / `1` | off |
| `bookable` | `true` / `1` — has at least one `Service` | off |
| `sort` | `recommended` · `nameAsc` · `nameDesc` · `newest` | `recommended` |
| `page` | 1-based | 1 |
| `perPage` | 1-48 | 9 |

Parsing lives in `server/src/services/providerSearch.ts`, not the route. Four things
about it are load-bearing:

- **Every value is narrowed to a closed set.** `?sort=anything-else` resolves to
  `recommended` rather than reaching Prisma.
- **`page` is clamped against the real total**, which is why `count` runs *before*
  `findMany` instead of beside it. `?page=999` returns the last page, so deleting rows
  cannot leave a bookmarked URL showing an empty grid under a "1 of 4" pager.
- **`q` terms are ANDed, each matching any of** `firstName`, `lastName`,
  `organization.name`, `services.name`, `categories.category.name`. So "sarah massage"
  narrows. `description` is deliberately excluded: longest column, weakest signal.
- **The list uses `providerListInclude`, not `providerInclude`.** The lean one drops
  `user`, `services` and `gallery` — three joins per row that `mapBasicProvider` never
  reads, and which a searchable list would otherwise pay for on every keystroke.

`Provider` carries two composite indexes for this, both prefixed by `listed` because
every public query filters on it: `[listed, available, updatedAt]` (the `recommended`
ordering) and `[listed, lastName, firstName]` (the name orderings). `newest` and the
search paths ride the `listed` prefix — a third index would cost writes for the
least-used control.

**Rating, price and distance are not filterable, on purpose.** `Review` has no aggregate
column, so a rating sort is an aggregate over every provider per page; `Service.price`
mixes currencies with no conversion table; `Provider.address` is free text with no
geocoding. Each would be a per-row computation or a wrong answer. See `docs/BACKLOG.md`.

### Provider services

`POST /providers/:providerId/services` and
`PUT|DELETE /providers/:providerId/services/:serviceId`.

- **The body is flat**, not wrapped in a `service` key: `name`, `duration` (whole minutes,
  stored as `durationMinutes`), `categoryId` or `categoryName`, `description`, `price`, `currency`, and
  `image` as a file part. JSON normally; `multipart/form-data` only when an image comes
  along. A nested `{ service: … }` under multipart serialises to `service[name]` keys,
  and multer does no bracket parsing — the API would read every field as `undefined`.
- **Three states per field.** Absent leaves the column alone, `''` clears it, anything
  else sets it. `''` is the only clear-marker that survives both transports, because
  axios drops `undefined` *and* `null` when serialising multipart.
- **`image` is only ever accepted as an upload.** The API answers with the stored
  `/uploads/<file>` path; sending that string back is a no-op.
- **Category is a combobox.** Send `categoryId` for a predefined Category (the same
  rows linked to organizations and providers), or `categoryName` for typed text. The
  API matches case-insensitively or creates a Category row so `Service.categoryId`
  stays a required FK. An unknown id with no name is a `400`. New categories are not
  auto-linked onto the provider or organization.
- **`currency` is a string**, not an enum — predefined ISO codes are suggestions; any
  trimmed value is stored.
- **Both the path id and the service are scoped to the session.** A `providerId` that is
  not the caller's is `403`; a `serviceId` the caller does not own is `404`, so one
  provider cannot reach another's service by guessing a uuid.
- **A service with appointments cannot be deleted** — `409`, because
  `Appointment.serviceId` is a required FK with no `onDelete`.

### Provider publish model

- **`listed`** — when `false`, the provider is hidden from Explore and public detail 404s for everyone except the owner (Preview). Copy URL, publish/unpublish, and delete page live on the Profile settings hero — there is no Listing sidebar tab.
- **`DELETE /provider-profile`** — removes the page. `409` when appointments exist (`Appointment.providerId` has no `onDelete`). A User with no remaining Consumer profile is removed with the page.
- **`available`** — pause new bookings; independent of listing.
- **`draft`** — JSON overlay (`firstName`, `lastName`, `description`, `imageUrl`, `weekSchedule`, `available`, `paymentInfo`). Save draft writes here; Publish copies onto live columns and clears draft.
- **`paymentInfo`** — `{ methods: ('cash'|'card_on_site'|'bank_transfer'|'other')[], reference?, notes? }`.
  Never a card PAN. **`methods` is plural** — a provider accepts a set, not one preference,
  and the booking sheet offers exactly that set. Read it through `toPaymentMethods`
  (`src/helpers/payment.ts`, or `server/src/lib/payment.ts`), which also tolerates the
  pre-migration singular `{ method }` still possible in a stale `draft` overlay.

## Booking

`POST /appointments` is **public**, and deliberately so. It used to sit behind
`requireConsumer`, which made a signed-in provider booking another provider a
`403 "Consumer access required"` — a role check standing in for an identity check.
Anyone can be a consumer; the only question is whether we know who is booking:

| Caller | Booked as |
|---|---|
| Consumer session | `consumerId` = the session's `profileId`. Guest fields in the body are **ignored**, so a signed-in caller cannot book under another name. |
| Any other session (a provider) | The `User` is already phone-verified, so a `Consumer` profile is found-or-created on it — seeded from the provider's own name — and the booking links to that. Never duplicated on repeat bookings. |
| No session | `consumerId` stays null and the `guest*` columns carry the booker. |

Request body adds `notes` (trimmed, **max 300**, matching `MAX_CHARS_FOR_TEXTAREA`),
`paymentMethods` (narrowed server-side to what the provider accepts — the client
offering only those is a convenience, not the guarantee), and `guest`
(`{ firstName, lastName, phone: { code, number }, email }`, all required together).

Other rules:

- A provider booking **their own** `providerId` is a `400`.
- **Throttled at 20/hour**, keyed on the session when there is one and the caller's
  address otherwise, counted only after validation so a malformed body costs nothing.
  Being public, this is the only brake on an open write — see `docs/BACKLOG.md` for its
  two limits (per-process counters, and `trust proxy` being unset).
- Every appointment must name a booker. Prisma cannot express that, so the
  **`appointment_actor_present`** CHECK constraint does — either `consumerId`, or
  guest first name + last name + phone.
- `Appointment.consumer` declares **`onDelete: Restrict` explicitly**. Prisma defaults an
  *optional* relation to `SetNull`, which would quietly turn a deleted consumer's
  appointments into guest bookings carrying no guest details.

Phone changes go through identity OTP endpoints and apply only after confirm. Email changes send a one-time link to the account profile (`?verifyEmail=` token); the hashed token lives on **User**. Never call `issueOtp` for a phone change (that upserts a second User by the new number).

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

`GET /identity/me` returns `{ role, profileId, firstName, lastName, image? }` from the
session cookie, which is how the client recovers its role after a refresh (the cookie is
httpOnly) and how the Header renders an avatar without a second fetch.

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

# Bookie — Database & API

PostgreSQL schema managed by Prisma in [`server/prisma/schema.prisma`](../server/prisma/schema.prisma).

## Core models

| Model | Purpose |
| --- | --- |
| **User** | Email identity (`citext`, unique) + argon2id `passwordHash` and/or `googleId`, `emailVerifiedAt`, `tokenVersion` for revocation, failed-login counters, pending email-verify and password-reset token hashes, optional 1:1 Consumer/Provider |
| **Category** | Service specialty (unique name) |
| **Organization** | Clinic / facility; M2M with Category |
| **Provider** | Professional profile, `weekSchedule` JSON, plan, optional organization, `listed`/`draft` for publish flow, email prefs + payment info, SEO overrides + vanity `slug` |
| **Service** | Bookable offering (duration, price, category) |
| **Consumer** | Patient/client profile — `firstName` + `lastName`, optional `description`/`email`, email prefs + payment info |
| **FavoriteProvider** | Consumer ↔ Provider favorites |
| **Appointment** | Booking with status enum and overlap index. `consumerId` is **nullable** — a guest booking carries `guest*` contact columns instead. `price`/`currency` are **snapshots** taken at booking time |
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
| POST | `/identity/register` | public — email + password + role; **does not sign in**, mails a verification link |
| POST | `/identity/login` | public (sets httpOnly cookie) |
| POST | `/identity/verify-email` | public — `{ token }`; copies `pendingEmail` onto `email` |
| POST | `/identity/resend-verification` | public — re-mints the link, invalidating the previous one |
| POST | `/identity/forgot-password` | public — always answers the same, to avoid an enumeration oracle |
| POST | `/identity/reset-password` | public — `{ token, password }`; bumps `tokenVersion` |
| POST | `/identity/change-password` | session |
| GET | `/identity/me` | session — `{ role, profileId, firstName, lastName, image? }` |
| POST | `/identity/logout` | session |
| PATCH | `/identity/phone` | session — phone is profile data now, not identity |
| POST | `/identity/change-email/send` | session — `{ email, returnPath }`; emails a link (dev: API console) |
| POST | `/identity/change-email/confirm` | session — same handler as `/verify-email` |
| DELETE | `/identity/account` | session |
| GET | `/identity/google` | public — starts the OAuth flow (`intent`, `role`, `returnPath`) |
| GET | `/identity/google/callback` | public — Google returns here; **redirects**, never JSON |
| GET | `/identity/google/pending` | pending cookie — prefill for the completion form |
| POST | `/identity/google/complete` | pending cookie — creates the account and signs in |
| GET | `/providers?q=&categoryId=&available=&openToday=&sort=&page=&perPage=` | public (`listed: true` only) — **paged**, see below |
| GET | `/providers/:idOrSlug` | public (owner may preview unlisted) — accepts a UUID **or** a vanity slug |
| GET | `/providers/:id/availability?date=` | public |
| GET/PUT/DELETE | `/provider-profile` | provider (`mode`: draft / publish / listing / live; DELETE removes the page) |
| GET | `/provider-profile/bookings?from=&to=&status=&serviceId=&q=&sort=&page=&perPage=` | provider — **paged**, own bookings only, see [Provider workspace](#provider-workspace) |
| GET | `/provider-profile/bookings/calendar?month=YYYY-MM&tz=` | provider — per-day counts for the calendar grid |
| GET | `/provider-profile/analytics?from=&to=&tz=` | provider — aggregates over own bookings |
| PATCH | `/provider-profile/seo` | provider — `seoTitle` / `seoDescription` / `seoKeywords` / `slug` |
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
| `openToday` | `true` / `1` — `weekSchedule` has hours on today's weekday | off |
| `sort` | `recommended` · `nameAsc` · `nameDesc` · `newest` | `recommended` |
| `page` | 1-based | 1 |
| `perPage` | 1-48 | 9 |

Parsing lives in `server/src/services/providerSearch.ts`, not the route. Five things
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
- **Unlisted pages are never returned.** That is `PUBLIC_PROVIDER_WHERE`
  (`listed: true`), not a query flag. Category directories reuse the same predicate.
- **`openToday` is hours on today's weekday**, not the `available` pause flag. It is a
  JSON path on `weekSchedule.<day>.availability.start` containing `:` (so `''` and a
  missing key miss). Remaining-slot math is deliberately not this filter — it cannot
  stay inside `count`/`findMany` without breaking pagination. `now` is the server
  clock; tests inject it.

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

- **`listed`** — when `false`, the provider is hidden from Explore and public detail 404s for everyone except the owner (Preview). New accounts start unlisted. Copy URL, publish/unpublish, and delete page live on the Profile settings hero — there is no Listing sidebar tab.
- **`DELETE /provider-profile`** — removes the page. `409` when appointments exist (`Appointment.providerId` has no `onDelete`). A User with no remaining Consumer profile is removed with the page.
- **`available`** — pause new bookings; independent of listing.
- **`draft`** — JSON overlay (`firstName`, `lastName`, `description`, `imageUrl`, `weekSchedule`, `available`, `paymentInfo`). Save draft writes here; Publish copies onto live columns and clears draft.
- **`paymentInfo`** — `{ methods: ('cash'|'card_on_site'|'bank_transfer')[], payToNumber?, notes? }`.
  **`methods` is plural** — a provider accepts a set, not one preference, and the booking
  sheet offers exactly that set. `payToNumber` is a provider-authored card or account
  number published on the public profile and the booking sheet; saving a new or changed
  value is confirmed in a dialog. Anyone who opens the page can copy it. Leftover
  `cardNumber` / `accountNumber` / `reference` keys are still read as that number by
  `toPaymentShare`. Read methods through `toPaymentMethods`
  (`src/helpers/payment.ts`, or `server/src/lib/payment.ts`), which also tolerates the
  pre-migration singular `{ method }` still possible in a stale `draft` overlay.
  **Consumer** `paymentInfo` is methods only: the payments tab writes `{ methods }` and
  `PUT /consumer-profile` strips `payToNumber` / `cardNumber` / `accountNumber` / `notes` /
  `reference` so leftover values cannot linger.
- **SEO columns are *not* draftable.** `seoTitle`, `seoDescription`, `seoKeywords` and
  `slug` save live through `PATCH /provider-profile/seo`, never through the `draft`
  overlay — see [Provider workspace](#provider-workspace).

## Provider workspace

Three provider-only reads over a provider's own data, all on `providerProfileRouter` and
therefore all scoped by `req.session.profileId`. **The provider id is never a parameter**,
so none of them can be aimed at another provider's calendar.

They are separate from `GET /appointments` on purpose. That route answers "what is coming
up" for either role and has two existing callers; adding a page window would change its
response from an array to an envelope and break both.

| Endpoint | Notes |
|---|---|
| `GET /provider-profile/bookings` | Paged `{ items, total, page, perPage, pageCount }`. Filters: `from`/`to`, repeatable `status`, `serviceId`, `q`. Sorts: `startDesc` (default — this is a history view), `startAsc`, `createdDesc`, `nameAsc`. Parsing lives in `services/providerBookings.ts`; every value narrows to a closed set, so a hand-edited query degrades to defaults rather than 500s. |
| `GET /provider-profile/bookings/calendar` | `{ month, timeZone, days }` where `days` is keyed `YYYY-MM-DD` — the same key the client's grid uses — with `{ total, live }` per day. Cancelled and no-show bookings count in `total` so the grid cannot disagree with the unfiltered list. |
| `GET /provider-profile/analytics` | Totals, the equal-length previous window, settled-only rates, a zero-filled daily series, top services, weekday/hour buckets, new-vs-returning clients, median lead time. `services/providerAnalytics.ts`. |

Three things about these that are easy to get wrong:

- **`tz` is a required part of the contract, not a nicety.** `startAt` is stored in UTC and
  `Provider` has no timezone column, so bucketing by the raw instant puts an evening
  booking on the following day for anyone east of Greenwich. The client sends
  `Intl.DateTimeFormat().resolvedOptions().timeZone`; an unknown value falls back to UTC
  rather than throwing.
- **Revenue is returned per currency and never summed.** `Service.currency` is free-form
  text, so one combined total would be a wrong number rather than a rough one.
- **Analytics is bucketed in memory, not in SQL.** One provider's bookings over the longest
  offered range is a few thousand narrow rows; `date_trunc … AT TIME ZONE` would be faster
  and untestable without the DB fixtures this repo does not have. The tipping point is a
  provider taking hundreds of bookings a day.

### `PATCH /provider-profile/seo`

Four columns, all **overrides**: absent means "leave it alone", `''` means "clear it back
to the composed default", anything else is the new value. Nothing here can blank a tag —
a cleared override restores what `generateMetadata` composes from the provider's name,
organization and categories.

Validation lives in `server/src/services/providerSeo.ts`:

| Field | Rule |
|---|---|
| `seoTitle` | ≤ 60 code points. **Rejected, not truncated** — the field is counted live in the browser, so an over-length body is a non-browser caller, and a half-title reaches Google mid-word. |
| `seoDescription` | ≤ 160 code points, same treatment. |
| `seoKeywords` | ≤ 10 entries, each ≤ 40 chars, ≤ 255 joined. Stored comma-separated. |
| all text | Line breaks become a space (never deleted — that would join two words); other control, bidi and zero-width characters are removed; `<` and `>` are refused; NFC-normalised. |
| `slug` | 3–40 chars, `a-z0-9` with single hyphens, **ASCII only**, not UUID-shaped, not reserved, `@unique`. |

The slug's three refusals each close a different hole: **ASCII-only** stops a Cyrillic
homograph rendering as another provider's link; **not UUID-shaped** stops a provider
claiming another's canonical `/providers/<id>` address (a UUID is hex in hyphen-separated
groups, so it passes the character rules); **reserved** stops a slug shadowing a route
segment or one of the 15 locale prefixes. Uniqueness is settled by the index, not the
validator — two requests can pass validation at the same instant — and the caught `P2002`
becomes a `409`.

`/p/<slug>` is a **307 redirect** to `/providers/<slug>`, served by a Route Handler so the
`Location` header is real rather than a streamed client-side navigation. It makes no API
call — `GET /providers/:idOrSlug` already accepts either form. The canonical stays the
**id** URL either way, because `generateMetadata` builds it from the resolved entity rather
than the route segment, so the two addresses never compete in an index. Temporary rather
than permanent because a 308 is cached by the browser and would outlive a slug change.

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

`price` and `currency` are **snapshotted** off the Service at creation, alongside
`durationMinutes` and for the same reason: an appointment is a record of what was agreed,
not a view onto today's price list. Without it, editing a service's price rewrote the
price of every booking already made against it, and last quarter's revenue changed when a
price did. Rows created before the snapshot migration were backfilled from the Service's
price *at migration time*, which is an approximation those rows cannot be rescued from.

`PATCH /appointments/:id` narrows `status` against `AppointmentStatus` before it reaches
Prisma. It used to pass the body value straight through, which was harmless only while the
one caller sent nothing and took the `'cancelled'` default.

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

Phone is **profile data, not identity** — `PATCH /identity/phone` writes it straight to the
caller's own profile with no confirmation step, because there is nothing to confirm: it is
never verified and has no unique constraint. Email changes send a one-time link; the hashed
token lives on **User**, and confirming runs the same handler as signup verification.

## Registration and sign-in

**Registration and sign-in are separate routes.** `POST /identity/register` creates the
account and mails a verification link; it **does not sign anyone in**, because an unverified
account cannot hold a session — `middleware/auth.ts` re-checks that on every authenticated
request, not only at login.

```jsonc
// POST /identity/register
{
  "role": "provider",                 // or "consumer"; `userType` is accepted as an alias
  "email": "alex@company.com",
  "password": "a-strong-password",
  // Mandatory, and an object. Profile data — never verified, never unique.
  "phone": { "code": 374, "number": 77000201 },
  "profile": {
    "firstName": "Alex",
    "lastName": "Morgan",
    "country": "AM",                  // ISO 3166-1 alpha-2; not derivable from phone.code
    // Provider only, mutually exclusive: an id links an existing organization, a name
    // matches one case-insensitively or creates it.
    "organizationId": "…",
    "organizationName": "Acme Services"
  }
}
```

**Every branch answers `{ "value": true }`.** A taken address, a new one, even a failed
send — all identical. A `409` for a taken address would turn the route into an oracle for
which addresses hold accounts, so the owner is told in their own inbox instead. An
**unverified** row is overwritten rather than refused: nobody can sign in to it, so it is
not yet an identity anyone owns.

```jsonc
// POST /identity/login  ->  sets the httpOnly cookie
{ "email": "alex@company.com", "password": "a-strong-password" }
// value: { role, profileId, userId, firstName, lastName, image? }
```

Failures carry a stable application `code` from `AUTH_ERROR` (`4001` invalid credentials,
`4002` unverified, `4006` Google-only account, …) rather than the HTTP status this codebase
otherwise puts there — the client has to *react* differently to some of them, and
string-matching a message is not a contract. Mirrored in `src/api/auth/types.ts`.

### Google

`GET /identity/google` starts the flow and `GET /identity/google/callback` finishes it.
Both **redirect**; they never answer JSON, so failures come back as `?error=<code>` from
`GOOGLE_ERROR` for the web app to translate.

- **State and PKCE live in a signed cookie** (`lib/oauth-state.ts`), because passport's own
  state stores all need `express-session` and this server has none. Without it passport
  falls through to `NullStore` — no nonce, no PKCE, and a callback that accepts any
  attacker-supplied `code`.
- **`email_verified` is checked** before any account is touched.
- A **verified** account on that address is *not* auto-linked — `google_account_exists`.
  Linking is an explicit action from settings, where a live session proves ownership.
- An **unverified** account on that address *is* claimed, and `tokenVersion` is bumped.
- A brand-new identity is parked in a short-lived cookie and sent to
  `/auth/complete-registration`, because Google supplies neither a role nor a phone and
  both profile tables need them. Nothing is written until `POST /identity/google/complete`.

`GET /identity/me` returns `{ role, profileId, firstName, lastName, image? }` from the
session cookie, which is how the client recovers its role after a refresh (the cookie is
httpOnly) and how the Header renders an avatar without a second fetch.

`GET /identity/me` returns `{ role, profileId, firstName, lastName, image? }` from the
session cookie, which is how the client recovers its role after a refresh (the cookie is
httpOnly) and how the Header renders an avatar without a second fetch.

## Local setup

1. Copy env: `cp server/.env.example server/.env`
2. Run `pnpm install` — generates Prisma client; applies migrations and seed when Postgres is up
3. Start Postgres if needed: `pnpm db:up` (requires Docker Desktop), then `pnpm db:setup`
4. Run API + web: `pnpm watch`
5. Frontend env: copy `.env.example` → `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4142`

**Dev login:** see [DEV_CREDS.md](DEV_CREDS.md) for the seeded provider/consumer emails and
the shared development password.

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

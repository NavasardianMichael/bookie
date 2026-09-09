# Backlog

Outstanding work, verified against the tree — not against what older docs claim.

The UI refactor's Phases 0–7 are **complete**. The old `UI_REFACTOR_HANDOFF.md` said
"Phase 6 not started" — commit `90499df` had already finished it, and every Phase 6 item
now checks out against the tree (`h-[56px]`
count is 1 and that one is a comment, `Input.OTP` has `min-w-0` + `autoComplete='one-time-code'`,
`Space.Compact` replaced the phone-input CSS, `antd-override.css` is gone, `AppFormSection`
is in use, `Row gutter` + `Col xs/sm/lg` landed in the week schedule, `Segmented` replaced
the radio group). Phase 7 is done except for the items listed below.

---

## Correctness

### 1. Forms: remove Formik, Ant Design `Form` becomes the single source of truth

The dual-binding is not untidy, it is broken. antd's store value **overrides** an
explicitly-passed `value={formik.values.x}`, and a custom child that does not spread
`...props` silently drops antd's injected `value`/`onChange`. Four live bugs:

| # | Where | Effect |
|---|---|---|
| 1 | `ProviderProfileForm.tsx:88` | `categoryIds` has `required` + `min:1` rules on an antd slot nothing ever writes → **the provider profile form cannot be submitted at all** |
| 2 | `ProviderProfileFormOrganization.tsx:36` | Writes key `organization`; payload builder reads `organizationId`. Organization selection is silently never submitted |

Scope: `ProviderProfileForm` + `ProviderProfileFormCategories` / `…Organization`. See the
`forms` skill for the target pattern, and `src/app/auth/**` for worked examples — the whole
auth funnel is now antd-only.

**Resolved by the provider services work** (2026-09-07): `ProviderServiceForm` and its three
sub-fields are antd-only, so bug 3 (`ProviderServiceFormCategory` reading `value.id` off a
string and storing `undefined`) is gone by construction — each field now implements the
`value`/`onChange` control contract. `ProviderServices.tsx` no longer imports Formik.

**Resolved by the registration work** (2026-09-05): `AccountTypeButtons` is gone — the
account-type screen is two links, so there is no selection state to disagree about;
`phone-number-input/components/form.tsx` is antd-only; and `OTPCodeInput` no longer has a
nameless `Form.Item` outside a `<Form>`, no longer navigates identically on success and
failure, and no longer swaps the country code with the phone number on resend.

### 2. The booking rate limit is per-process, and `req.ip` is untrusted

`POST /appointments` is public as of 2026-09-08 and throttled at 20/hour via
`createRateLimiter`, keyed on the session where there is one and `req.ip` otherwise. Two
limits inherited from that design:

- **In-memory and per-process.** Behind more than one API process the effective limit
  multiplies by the process count. Moving it to Redis or the proxy is the same piece of
  work `lib/rateLimit.ts` already flags for the contact form.
- **`app.ts` never sets `trust proxy`.** Behind a load balancer every request carries the
  balancer's address, so the IP bucket collapses into one shared counter and 20/hour
  would apply to *all* anonymous bookings site-wide. Set it — deliberately, to the real
  hop count — before deploying behind a proxy. Affects `routes/contact.ts` equally.

### 3. A provider cannot see the bookings they *made*, only the ones they received

Narrowed on 2026-09-09. `/providers/profile/bookings` now shows a provider every
appointment booked **with** them, so the original framing ("a provider's own bookings are
invisible") no longer holds. What is left is the other side of the same `where`:

`GET /appointments` still picks its filter off `session.role` alone — provider →
`providerId`, consumer → `consumerId`. A provider who books *another* provider gets a real
`Consumer` profile on their `User` and a properly linked appointment, but their session
role is still `provider`, so that booking appears in no list they can open. The new
workspace endpoint does not help: it is scoped to `providerId` by design.

The data is correct and reachable; only the read path is one-sided. Fixing it means either
returning both sides when a `User` has both profiles, or a role switch in the UI — neither
is a one-liner, because the consumer and provider appointment views render differently.

### 4. Two slot engines that disagree

`getProviderAvailability` (`server/src/services/appointments.ts`) steps a **fixed 30
minutes** and excludes already-booked slots. The UI does not call it: `BookingPanel`
computes slots client-side from `weekSchedule` via `getSlotsForDateRange`, stepping by the
**selected service's duration**, and subtracts nothing but the starts requested in the
current session. So the grid can offer a time the server will reject, and the `409
"Time slot not available"` is the only real defence. One of the two should go.

### 5. `no-show` vs `no_show`

`src/interfaces/appointments.ts:5` declares `'no-show'`; the Prisma enum is `no_show`, and
`ConsumerAppointmentsClient.tsx:36` filters on `'no_show'`. The interface is the one that
is wrong.

### 6. `FavoriteProvider` schema/DB drift

`prisma migrate diff` reports `[+] Added primary key on columns (consumerId, providerId)`
against the live database. The init migration created the table with a composite **primary
key**; `schema.prisma` declares only `@@unique`. Predates all current work and is harmless
in practice, but it means the drift check is never clean, so a real drift has nothing to
stand out against.

### 7. `splitScheduleIntoParts` mutates its caller's break objects

`src/helpers/schedule.ts` — `[...breaks]` is a shallow copy, so `last.end = …` writes
through into the original `DaySchedulePart`. Latent corruption under immer drafts.
Pinned by a regression test in `tests/unit/helpers/schedule.spec.ts`.

### 8. Smaller pure-logic defects (each has a test recording current behaviour)

- `normalizedToFlat` yields `undefined` for an `allIds` entry with no `byId` match.
- `generateEntityUrl('home', id)` → `//<id>`, since `ROUTES.home === '/'`.
- `processError(null)` throws `TypeError` instead of returning an `AppError`.
- `booking.ts` parses `'HH:mm'` strictly; `schedule.ts` parses the same format
  non-strictly. Malformed input behaves differently between the two.

---

## Cleanup

- **`src/constants/api.ts`** is a byte-identical duplicate of `paramsToQueryString` from
  `src/helpers/api.ts`. Delete *this* one — the `helpers` copy now has a caller
  (`api/organizations/main.ts` builds the `?q=` search with it).
- **`src/helpers/urlSearchParams.ts`** — both functions read `window.location.search`,
  neither is referenced anywhere, returns are untyped. Delete.
- **`src/store/categories/list/store.ts`** ships fake seed data in `initialState`
  (`allIds: ['c-1']`).
- **`src/constants/form.ts`** — `FORM_DEFAULT_VALIDATION_MESSAGES` is never wired to
  `ConfigProvider` or any `<Form validateMessages>`.
- **`use…StoreBase` vs `use…Base`** suffix drift between list and single stores.
- **The whole `Settings` namespace is English in all 15 locales** — every key under it is
  byte-identical to `en.json` everywhere. `Language`, `Common`, `Nav`, `Footer` and
  `Booking` are genuinely translated; `Settings` was added English-only and never
  followed up. Every account-settings screen therefore renders English inside an
  otherwise-translated shell. The payment-method labels were translated on 2026-09-08
  because the booking sheet surfaces them to end users; the rest were left.
  The Bookings / Analytics / SEO tabs (2026-09-09) added ~100 more keys the same way —
  matching the documented state of the namespace rather than pretending otherwise. All of
  it is provider-facing and behind auth, which is why it has stayed lower priority than
  the public pages below.
- **Validation messages are hardcoded English.** `FORM_ITEM_RULES` in
  `src/constants/form.ts` holds literal strings (`'Please fill in ${label}'`), so every
  form in the app — the translated booking sheet included — shows English on a failed
  field. Fixing it means either moving the rules behind `useTranslations` or finally
  wiring `FORM_DEFAULT_VALIDATION_MESSAGES` into `ConfigProvider` with translated values.

---

## UI — remaining Phase 7

1. **`src/app/organizations/[organizationId]/loading.tsx` is missing.** Every other
   detail and list route has one.
2. **`active:` feedback states** — only 6 usages. `-webkit-tap-highlight-color: transparent`
   is set globally, so without them taps feel unregistered on custom-styled tappables.
3. **antd `style`/`styles` px leak sites** — the byte-identical
   `Divider`/`Space` pairs in `ProviderProfileFormCategories.tsx:44` and
   `ProviderProfileFormOrganization.tsx:44`, plus two CSS Modules.
4. **FullCalendar is orphaned, and the decision it was waiting on has now been taken.**
   The `public_provider_profile` rebuild replaced the month/week/day view with
   `BookingMonth` + `BookingSlots`, leaving `@fullcalendar/react`, its `temporal-polyfill`
   peer, `src/styles/full-calendar-override.css` (~100 lines, imported by nothing) and
   `booking.ts#getVisibleTimeRange` / `#groupSlotsByPartOfDay` with no call site.

   This entry used to say "do not rip them out yet", because the unbuilt
   `provider_calendar_dashboard` was a week time-grid and that is the one shape a
   hand-rolled grid is genuinely worse at. **That build happened on 2026-09-09 and went
   the other way**: `/providers/profile/bookings` is a month grid over a list, sharing
   `buildMonthCells` with the public calendar, and it needs none of the four. Nothing in
   the tree is now waiting on FullCalendar, so removing all four is unblocked — it is
   simply out of scope for the work that unblocked it.

---

## Design sync — one mockup still unmatched

`design/initial prototype/` holds nine independently-generated mockups. The 2026-09-01
sync pass matched the visual language of six of them; the two registration screens were
then built field-for-field on 2026-09-05 (`/auth/consumer-registration`,
`/auth/provider-registration`). Account settings for consumer and provider landed next
(`/consumers/profile`, `/providers/profile` + nested tabs). One dashboard mockup remains:

| Mockup | Route today |
|---|---|
| `provider_calendar_dashboard` | `/providers/profile/bookings` + `/providers/profile/analytics` — partly matched, see below |

**Partly matched on 2026-09-09.** `/providers/profile/bookings` and
`/providers/profile/analytics` build the mockup's substance — a month calendar that filters
a day's clients, and the four-tile stat row `StatTile` was written for (its `stack` layout
and `tone='brand'` variant name this prototype in their docstring). Three pieces are
deliberately not matched:

| Mockup piece | Built as | Why |
|---|---|---|
| Day / Week / Month segmented week time-grid | A month grid over a filtered list | A time-grid answers "what does Thursday look like hour by hour"; the request was to filter a day's clients. It is also the only shape that would have justified keeping FullCalendar — see item 4. |
| "Today's Sessions" panel with a live current-time rule | Omitted | It is the week grid's companion, and a ticking rule is a client timer on a screen that is otherwise static. |
| Sidebar "Accepting Bookings" toggle | Already the Profile tab's `available` control | Duplicating it into a second place is two controls writing one column. |

What remains genuinely unbuilt from this mockup is the **week time-grid** itself.

---

## Not verifiable from the CLI

Needs a real browser or device:

- **Breakpoint sweep** at each breakpoint **and one pixel below** — off-by-one boundary
  bugs are exactly what a three-scale codebase produces:
  `320 · 360 · 390 · 479/480 · 575/576 · 767/768 · 991/992 · 1199/1200 · 1440 · 1599/1600 · 1920 · 2560`,
  plus **844×390 landscape** for the `dvh` math.
- **Overflow detector**, in the console at each width:
  ```js
  [...document.querySelectorAll('*')]
    .filter((el) => el.scrollWidth > document.documentElement.clientWidth + 1)
    .forEach((el) => { el.style.outline = '2px solid red'; console.log(el.scrollWidth, el) })
  ```
- **Keyboard pass**: skip link → `#main`; Drawer opens with Enter, traps focus, closes on
  Escape, returns focus to the hamburger; `aria-expanded` flips; visible focus ring everywhere.
- **`BreakpointInvariant` console output** should be silent in dev.
- **Real iOS Safari** — safe-area insets with `viewportFit: 'cover'`, `dvh` as the URL bar
  collapses, momentum scroll.
- **Real Android Chrome** — soft keyboard vs `interactiveWidget: 'resizes-content'`.
- **Lighthouse mobile** — CLS should be ~0 now that every image sits in an aspect box.

---

## Infrastructure

- **No CI workflow.** There is no `.github/` directory at all. A GitHub Actions workflow
  running `typecheck + lint + test + build` is the only thing that would enforce the
  design-system grep gates or catch a `'use client'` regression automatically — the
  Husky pre-commit hook only runs `eslint --fix` on staged files.
- **`pnpm typecheck` does not cover `server/`.** The root `tsconfig.json` lists `server` in
  its `exclude`, so nothing in the documented `typecheck → lint → test → build` loop ever
  typechecks the API. `npx tsc -p server` reports **5 errors** today, all in
  `server/src/routes/providers.ts` (lines 201, 205, 221, 222, 227): `ProviderDraft` and the
  `draft` / `paymentInfo` JSON columns do not satisfy Prisma's `InputJsonValue` (which
  rejects `null` — that needs `Prisma.DbNull`), and the mapper is handed a provider selected
  without its `categories` / `organization` relations. Fix those, then add a server
  typecheck to the loop, or the API keeps drifting unchecked.
- **A stale `.next/types/validator.ts` breaks `pnpm typecheck`.** It still resolves
  `providers/profile` and `providers/profile-services` at their pre-`613a8a8` paths, before
  they moved into the `(account)` route group — both URLs still work, only the generated
  file is stale — so the root typecheck fails with two `TS2307`s for reasons unrelated to
  the source. A fresh `next build` regenerates it; worth knowing before chasing a phantom
  type error.
- **Seed idempotency has no automated guard.** `server/prisma/seed.ts` must be re-runnable
  because `postinstall` seeds on every install (see the table in `server/CLAUDE.md`), but
  `tests/` has no DB-backed suite at all — nothing imports `PrismaClient`. A regression to
  a plain `create` would only surface as a `P2002` in someone's install log, or, for the
  models with no unique constraint, as silent row growth. An integration test that seeds
  twice and compares counts needs DB fixtures this repo does not have yet.
- **No `.gitattributes`.** Every git command warns `LF will be replaced by CRLF`.
  One line — `* text=auto eol=lf` — removes the noise permanently.
- **E2E is scaffolded, not written.** `tests/e2e/smoke.spec.ts` proves the harness runs;
  the auth OTP flow, booking slot selection, and provider profile edit are the specs worth
  having, and they need `pnpm db:up && pnpm db:setup && pnpm watch` first.

---

## Open assumptions

Each is a one-line reversal:

1. **`showLogo` defaults to `true`**. Inverts in `getHeaderConfig` in `src/constants/header.ts`.
2. **No mobile bottom tab bar.** `<main>` already carries `app-safe-b`, so adding one
   later is purely additive.

---

## Auth — mostly closed

Closed by the registration work (2026-09-05):

- **401 handling** is implemented in `src/api/axiosInstance.ts` — a browser-guarded
  full-page redirect, which also discards every Zustand store along with the dead session.
- **Route protection** exists: `src/proxy.ts` (Next 16 renamed Middleware to Proxy) guards
  the provider and consumer profile areas on cookie presence. Next's own docs are explicit
  that Proxy is not an authorization layer, so it is an optimistic check only — real
  enforcement remains the API's `requireProvider` / `requireConsumer`.
- **Session recovery**: `GET /identity/me` + the store's `getMe` let the client rediscover
  its role and `profileId` after a refresh.

Still open:

- **No client-side session persistence.** The auth store has no `persist` middleware, so a
  refresh needs the `getMe` round trip. That is deliberate — `persist` has no precedent in
  this codebase — but it means a brief unauthenticated flash on protected client islands.
- **`/auth/logout`'s "Delete Account Permanently" button still has no handler**, and there
  is no delete-account endpoint. The store now has a `logout` action wired to
  `POST /identity/logout`, but this page does not call it.
- **No OTP rate limiting or attempt cap** on the server (`server/src/lib/otp.ts`).

---

## Smaller, carried over

- **`export const dynamic = 'force-dynamic'`** on list and detail routes was a build
  workaround so `next build` would not prerender against a missing `NEXT_PUBLIC_API_URL`.
  With a real API, prefer `export const revalidate = 60` or `fetch` cache tags, and
  generate static params for popular providers and categories.
- **`AppInput` and `AppButton` are near-empty passthroughs** — they only merge
  `className` through `cn`. Either give them real behaviour or drop the indirection.
- **`pnpm format` only formats `src/`** (`cd src && npx prettier --write .`). It misses
  `eslint.config.mjs`, `next.config.ts`, `server/`, `tests/`, and every root doc.
- **Entity types live under `src/store/**/types.ts`** even for domains whose store is
  barely used, so Server Components import types from Zustand files. Moving shared
  entities to `src/interfaces/` would remove that. Currently a deliberate, documented
  pattern — change it only if the store/server split above happens.

---

## Explore — the three filters that were left out

`GET /providers` (2026-09-08) filters on search, category, `available` and
`openToday`, and sorts on name / `updatedAt` / `createdAt`. Three controls the
prototype implies are **deliberately absent**, each because the data to back it cheaply
does not exist yet. Do not add one without the column it needs:

| Control | Blocked on | What a naive version would cost |
|---|---|---|
| Rating filter / sort, and the star badge on the card | No aggregate on `Provider` — `Review` rows only | An `AVG` over every provider's reviews per page render. Wants a denormalised `ratingAvg` / `ratingCount`, written on review create/update. |
| Price range | `Service.price` is per-service and `Service.currency` is free-form | A `price <= N` across mixed currencies is not a wrong-ish answer, it is a wrong one. Wants a currency table, or prices normalised to minor units in one currency. |
| Location / distance | `Provider.address` is free text, `locationUrl` is a Maps link | `contains` on an address string matches text, not places — a radius search that is not one. Wants lat/lng columns and geocoding at write time. |

Also missing from the card versus the prototype: **"Next: Today, 2 PM"**. That is one
`getProviderAvailability` call per card per render — the shape the whole paged query was
built to avoid. It wants a cached `nextAvailableAt`, invalidated on schedule and
appointment writes.

## Explore and the public pages are not translated

`/providers`, `/`, `/categories` and `/organizations` hardcode English. The 15 locale
catalogues cover `Language`, `Common`, `Nav`, `Footer` and `Settings` only — chrome and
account settings — so the new Explore copy (search placeholder, sort labels, the two
filter labels, both empty states, the pager's `aria-label`s) follows the page it lives
on and is English too.

This is consistency with the surrounding code, not a decision that it should stay that
way: the locale is already a path segment and `localizedAlternates()` advertises all 15
variants of `/providers` on every one of them, so a crawler is told those pages are
translated when they are not. Fixing it is one `Explore` (and `Home`, `Categories`, …)
namespace per page, added to all 15 files at once — `tests/unit/i18n/catalogues.spec.ts`
fails on a key that is missing from any locale, which is what makes a partial pass
visible.

## Larger, deferred

**Split server data from UI state.** Stores currently own API calls while list pages also
fetch the same endpoints in Server Components. A cleaner split: Server Components own
first paint / SEO / JSON-LD; TanStack Query (or Next's `fetch` cache) owns client refetch
and mutations; Zustand keeps session, UI chrome, and unsaved drafts. `appendSelectors` is
worth keeping for the UI stores either way.

Note `useSingleProviderStore` is hydrated with `JSON.parse(JSON.stringify(initialState))`
*after* the page has already fetched — a store that is only a cache of a Server
Component's props is the clearest case for this split.

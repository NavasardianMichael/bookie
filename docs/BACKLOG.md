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

### 1. ~~Forms: remove Formik~~ — done 2026-09-11

`formik` is no longer a dependency and `src/interfaces/forms.ts` is gone. The seven files
in `src/components/providerProfileForm/` are antd-only, each custom field implements the
`value`/`onChange` control contract, and both live bugs are fixed by construction:
`categoryIds` is now written by the slot its rules validate (the form was previously
**impossible to submit**), and the organization select writes `organizationId` — the key
the payload builder actually reads. Pinned by
`tests/unit/components/providerProfileForm.processors.spec.ts`.

The only remaining mentions of Formik in `src/` are comments recording that it is gone.

### 2. The booking rate limit is per-process, and `req.ip` is untrusted

`POST /appointments` is public as of 2026-09-08 and throttled at 20/hour via
`createRateLimiter`, keyed on the session where there is one and `req.ip` otherwise. Two
limits inherited from that design:

- **In-memory and per-process.** Behind more than one API process the effective limit
  multiplies by the process count. Moving it to Redis or the proxy is the same piece of
  work `lib/rateLimit.ts` already flags for the contact form.

### 3. ~~A provider cannot see the bookings they *made*, only the ones they received~~ — done 2026-09-18

`/providers/profile/bookings` lists appointments booked **with** the provider.
`/providers/profile/consumer-bookings` lists the ones they booked as a client. The
header switch toggles them; there is no second sidebar tab. Both reads live on
`providerProfileRouter` (`GET /provider-profile/bookings` and
`/consumer-bookings`). The consumer-side pair looks up the User's Consumer row and
answers empty if there is none — it does not create one. `PATCH /appointments/:id`
treats that same Consumer row as ownership, and only allows cancel from
scheduled/confirmed when the caller is acting as the client.

`GET /appointments` still picks its filter off `session.role` alone. That is now
fine: the workspace has its own paged reads, and that route still answers "what is
coming up" for whichever role the session is.

### 4. `tsc -p server` does not catch a wrong Prisma field name

Found on 2026-09-11, the hard way. `prisma.consumer.upsert({ create: { …, publicEmail } })`
**typechecks clean** even though `Consumer` has no such column — Prisma types `create` as
`XOR<CreateInput, UncheckedCreateInput>`, and TypeScript's excess-property check against
that union does not fire. It failed at runtime instead, as a
`PrismaClientValidationError` on the first `pnpm db:seed`.

So `pnpm verify` gives **false confidence for
query payloads**: a misnamed field in any `create`/`update`/`where` reaches production
unless something executes that query. Nothing in `pnpm test` touches a database
(`tests/CLAUDE.md` keeps the suite dependency-free), so nothing does.

Two compounding traps found alongside it:

- **A stale generated client silently changes what typechecks.** `prisma generate` had not
  run since the schema last changed, so an *earlier* run of `tsc -p server` was checking
  against a client with different columns. Run `prisma generate` before trusting a server
  typecheck after any schema edit.
- The real gate for the seed is **running it**. `pnpm db:setup` belongs in any change that
  touches `schema.prisma` or `seed.ts`.

### 5. ~~Seeded organizations are duplicated 7×~~ — done 2026-09-11

Fixed by the `20260911000000_dedupe_organizations` migration, which collapses each name
onto its earliest row, moves the union of categories onto the survivor, and repoints
`Provider` / `Appointment` / `Review` before deleting the rest. Verified on a database
carrying the duplicates: 56 rows → 8, no orphaned providers, category links intact. A
no-op on a clean database.

Deliberately **not** paired with a `@@unique` on `Organization.name` — two real clinics in
different cities may legitimately share one, so that is a product decision. Both paths that
produced the duplicates are already closed (the seed's `findFirst`, and
`resolveOrganizationId`'s case-insensitive match).

### 6. ~~Two slot engines that disagree~~ — done 2026-09-22

`getProviderAvailability` is gone. It stepped a **fixed 30 minutes**, which is why nothing
ever called it: `BookingPanel` steps by the *selected service's* duration, so the server's
grid could not answer for a 45-minute service. The consequence was that the public
calendar subtracted nothing at all — every visitor saw every in-hours time as free, and
the `409` was the only defence.

The split is now by responsibility rather than by layer. `GET /providers/:id/busy?from=&to=`
returns booked **intervals** — the only shape that does not presuppose a step — and
`helpers/booking.ts#dropBusySlots` subtracts them from the grid the client steps itself,
on overlap rather than equality. `pending` bookings are in that set, so a slot awaiting a
provider's approval is already unbookable.

The `409` remains the authority, because two people can still submit in the same instant.
What changed is that it is now *recoverable*: `SLOT_TAKEN_MESSAGE` is pinned across the two
packages by `tests/unit/server/bookingErrors.spec.ts`, and the sheet matches on it to
refresh the grid and say "pick another time" instead of showing a raw error.

### 6b. `POST /appointments` never checks `startAt` against the provider's hours

Found 2026-09-22 while testing booking approval. `createAppointment` validates the service,
the overlap and the payment methods — and nothing at all about *when* the slot is. A direct
POST books 03:00 on a day the provider is closed, and it lands on their calendar looking
like any other appointment.

The UI never offers such a time, which is why this has never been seen: the grid is built
from `weekSchedule`. But `POST /appointments` is **public**, so the UI is not the guard —
the same reasoning that put the overlap check server-side applies here and was not
followed through.

The fix is to run the request's `startAt` through the same availability-minus-breaks
arithmetic the client uses, server-side, and `409` a slot that is not one. That means
sharing `splitScheduleIntoParts`-equivalent logic across the two packages, or duplicating
it with a test pinning the two — which is why it is a backlog entry rather than a line.

**No `KNOWN BUG:` test pins this**, against the usual rule: `services/appointments.ts`
imports Prisma, so `tests/unit/server/` cannot reach it (`tests/CLAUDE.md`), and nothing in
`pnpm test` touches a database. The same blind spot as entry 4.

### 6c. ~~`/providers/profile/consumer-bookings` has no entry point~~ — done 2026-09-23

Resolved by moving Bookings out of settings. `/bookings` is a top-level page in the header,
and for a provider whose account also holds a Consumer profile it carries a "Booked with
me / Booked by me" switch. The second view is exactly what this route rendered, with the
calendar and filters intact. The route itself is now a 307 to `/bookings`, alongside
`/providers/profile/bookings` and `/consumers/profile/appointments`. The objection to a
second switch no longer applies, because there is no settings tab left for it to duplicate.

### 7. ~~`no-show` vs `no_show`~~ — done 2026-09-11

`src/interfaces/appointments.ts` was the only place declaring the hyphenated form, and it
had **no importers at all** — the live types moved to `src/api/appointments/types.ts`,
where `BOOKING_STATUSES` already matches the Prisma enum. The dead file is deleted rather
than corrected, so the drift cannot come back through it.

### 8. Schema/DB drift — `FavoriteProvider` done 2026-09-23, `Review.updatedAt` open

**`FavoriteProvider` is fixed.** `20260923000000_favorites_per_user` re-keyed the table on
`User`. `schema.prisma` now declares the composite `@@id` the database always had, and the
migration drops the redundant unique index the init migration created alongside it.

**One drift remains.** `prisma migrate diff --from-schema-datasource
--to-schema-datamodel` still reports `Review.updatedAt` "default changed from `Some(Now)` to
`None`". `20260915000000_provider_reviews` adds the column with `DEFAULT CURRENT_TIMESTAMP`
on purpose: a bare NOT NULL column cannot be added to a table that already has rows. The
schema's `@updatedAt` declares no default. The drift is harmless, because Prisma writes the
column on every update, but the check is still not clean. A follow-up migration dropping the
default (every row is backfilled by now) would make it clean.

### 9. ~~`splitScheduleIntoParts` mutates its caller's break objects~~ — done 2026-09-11

Each break is copied into the accumulator now, so the merge cannot write through into the
caller's schedule. Its test asserts the input is left untouched, that overlapping breaks
still merge, and that two calls on the same array agree.

### 10. ~~Smaller pure-logic defects~~ — done 2026-09-11

All five are fixed and their `KNOWN BUG:` tests rewritten to assert the correct behaviour:

- `normalizedToFlat` drops an `allIds` entry with no `byId` match instead of yielding
  `undefined`, so its `T[]` signature stops lying.
- `flatToNormalized` appends a duplicate id once, so a round trip is lossless and React
  no longer sees two children with one key.
- `generateEntityPath` strips a trailing slash, so `generateEntityUrl('home', id)` is
  `/<id>` rather than `//<id>` — a protocol-relative URL, not merely an ugly one.
- `processError` uses `error?.message`, so `processError(null)` returns an `AppError`
  instead of throwing a `TypeError` from inside the app's last error handler.
- `splitScheduleIntoParts` copies each break into its accumulator, so it no longer writes
  through into the caller's own objects.

Still open from the original list: `booking.ts` parses `'HH:mm'` strictly while
`schedule.ts` parses it non-strictly, so malformed input behaves differently between them.

---

### 11. The `!`-suffix gate never ran

Found 2026-09-11 while moving the grep gates into `scripts/gates.mjs`. The documented
one-liner was `grep -rnoE "[a-z0-9)\]]!'"`. In a POSIX bracket expression a backslash is a
literal backslash, not an escape, so the set parsed as *a-z, 0-9, `)`, and a literal
backslash* — followed by a *literal* `]` — it matched only a `!` sitting directly after a `]`, never `block!`. It
reported 0 for as long as it existed, and `src/styles/CLAUDE.md` recorded that 0 as proof
the rule held.

Five real `!` suffixes were hiding behind it, all in `src/components/providerProfileForm/`:

| File | Class |
|---|---|
| `ProviderProfileFormGallery.tsx:99` | `mt-4!` |
| `ProviderProfileFormGallery.tsx:103` | `rounded-tr-lg! rounded-tl-lg! block!` |
| `ProviderProfileFormGallery.tsx:110` | `rounded-tr-none! rounded-tl-none!` |
| `ProviderProfileFormImage.tsx:78` | `block!` |
| `ProviderProfileFormOrganization.tsx:54` | `pl-0!` |

Each overrides an antd internal, so removing one is a visual change that cannot be
verified from the CLI — which is why they are **baselined**, not deleted: they sit in the
`allow` list in `scripts/gates.mjs`, each naming this entry, and a sixth suffix fails the
gate. Fixing them means moving the value into an antd token (`src/styles/CLAUDE.md`) and
checking each of the three screens in a browser.

### 12. The password-reset link's param name is held only by inspection

Found 2026-09-19 while fixing the signup-verification equivalent, which had actually
broken: the server minted `?verifyEmail=` and `app/[lang]/auth/verify-email/page.tsx` read
`?token=`, so every confirmation link landed tokenless and the page reported a valid link
as expired. Nothing failed — the param is a string on both sides, in two packages with no
shared type, so it typechecks, lints and builds.

That pair is now pinned: `buildEmailVerifyUrl` and `EMAIL_VERIFY_QUERY` moved into the
dependency-free `lib/return-path.ts`, and `tests/unit/server/returnPath.spec.ts` asserts the
server constant equals `EMAIL_VERIFY_QUERY` in `src/constants/auth.ts`.

`buildPasswordResetUrl` is not. `lib/password-reset.ts` imports config, Prisma and the mail
client, so `tests/unit/server/` cannot reach `PASSWORD_RESET_QUERY` — the reset link and
`TOKEN_QUERY` agree today only because someone checked. Fixing it is the same move: lift
`PASSWORD_RESET_QUERY` and `buildPasswordResetUrl` into `lib/return-path.ts`, re-export them
from `lib/password-reset.ts` so call sites are untouched, and add the equality assertion
next to the verification one. Not done here to keep a production fix narrow.

No `KNOWN BUG:` test accompanies this one: the behaviour is currently *correct*, and a test
asserting the two constants match is the fix rather than a record of a defect.

---

## Errors — what the 2026-09-23 pass left open

The error pipeline (`src/components/CLAUDE.md` → *Errors*, `server/CLAUDE.md` → *What a
failure answers*) covers every surface. These are the edges it deliberately stops at:

- **No monitoring.** `src/helpers/reportError.ts` is `console.error`, so a failure a visitor
  sees is recorded only in their own console, and the digest an error page shows can be
  matched only against the API's stdout. A monitoring client plugs in there and nowhere
  else; the choice of service is open.
- **The envelope `code` means three things.** The HTTP status on most routes, `-1` on
  many 400s (`HttpError`'s default), and an `AUTH_ERROR` code on `/identity/*`. The client
  classifies by HTTP **status** and treats only the `AUTH_ERROR` range and the slot-taken
  message as codes, so this is harmless today — but a stable per-case code (e.g.
  `SLUG_TAKEN`) is the only way to give a specific 409 or 400 its own translated sentence
  without the call site knowing to pass an override.
- **Validation answers one string, for the first failing field.** There is no per-field
  map, so a form cannot highlight which field the server refused. The client mirrors the
  rules that matter (`usePasswordRules`, the form rules), so a server 400 is mostly
  client/server drift; shown as the generic *validation* copy.
- **The two auth code mirrors are pinned only by inspection.** `AUTH_ERROR_CODES` and
  `GOOGLE_ERROR_CODES` (`src/constants/auth.ts`) copy `server/src/routes/identity.ts` and
  `lib/google-oauth.ts`; both server modules import config, so no unit test reaches them.
  Same fix as #12: lift the constants into an import-free module.
- **The service worker's offline page is English-only** (`src/helpers/pwa.ts`). It has a
  working *Try again*; translating it means inlining 15 copies of two sentences into
  `/sw.js` and choosing by the navigation's locale segment.
- **`/auth/logout`'s "Delete Account Permanently" button has no `onClick`**, and the page
  is hardcoded English. Not an error path — found on the way. Account deletion itself lives
  in `DeleteAccountSection` on both Profile tabs.
- **Profile creation's pickers, beyond loading.** `ProviderProfileForm` now loads both lists,
  but `ProviderProfileFormCategories` is a `mode='tags'` Select, so a typed name is
  submitted *as a category id* (`processors.ts` stringifies `categoryIds` as-is); both
  pickers' "create new" links go to a hardcoded `'/'`; and the organization picker's
  `addItem` focuses an `inputRef` attached to nothing. The registration screens'
  debounced `OrganizationAutocomplete` is the likely replacement for the organization half.

---

## Cleanup

- **`react-world-flags` is 80% of the registration payload.** Measured on the 16.3.1
  production build: the library compiles to a single **3.57 MB** client chunk
  (**1.18 MB** gzipped) of inlined SVG data-URIs — every flag on earth. It is imported
  from exactly one file, `src/app/[lang]/auth/components/Country.tsx`, the phone-country
  picker, and lands on five routes: both registration pages, `/auth/complete-registration`,
  `/consumers/profile` and `/providers/profile`. `/auth/consumer-registration` ships
  **4.48 MB raw / 1.48 MB gzipped** across 26 chunks, and the flags are most of it.
  The picker renders ~20 flags at 20×15px in a dropdown, so the fix is either
  regional-indicator emoji (zero bytes, native rendering) or one CSS sprite if pixel
  parity across Windows matters. To re-measure after a build, sum the chunk files listed
  in `.next/server/app/[lang]/auth/consumer-registration/page_client-reference-manifest.js`.

- ~~**`src/constants/api.ts`** duplicate of `paramsToQueryString`~~ — deleted 2026-09-11;
  the `src/helpers/api.ts` copy is the live one.
- ~~**`src/helpers/urlSearchParams.ts`**~~ — deleted 2026-09-11, unreferenced and untyped.
- ~~**`bcryptjs` is a dead dependency.**~~ Removed 2026-09-11 along with
  `@types/bcryptjs`; it hashed the OTP and went with `lib/otp.ts`. The only remaining
  mentions are two comments in `lib/password.ts` contrasting argon2 with it.
- **`src/constants/form.ts`** — `FORM_DEFAULT_VALIDATION_MESSAGES` is never wired to
  `ConfigProvider` or any `<Form validateMessages>`. Field-level copy now comes from
  the `Validation` catalogue via `useFormItemRules`.
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

---

## UI — remaining Phase 7

1. ~~**`organizations/[organizationId]/loading.tsx` is missing.**~~ Added 2026-09-11,
   mirroring the detail page's own shape (Surface + PageHeader over the `<dl>`) so the
   handoff costs no layout shift. Every detail and list route has one now.
2. **`active:` feedback states** — only 6 usages. `-webkit-tap-highlight-color: transparent`
   is set globally, so without them taps feel unregistered on custom-styled tappables.
3. **antd `style`/`styles` px leak sites** — the `Divider`/`Space` pairs in the two
   provider-profile selects were replaced with Tailwind utilities during the Formik
   removal (2026-09-11). **Two CSS Modules still leak**, and are what is left of this item.
4. ~~**FullCalendar is orphaned.**~~ Removed 2026-09-11, now that
   `/providers/profile/bookings` has shipped as a month grid and nothing is waiting on it:
   `@fullcalendar/react` and its `temporal-polyfill` peer are out of `package.json`,
   `src/styles/full-calendar-override.css` is deleted, and `booking.ts#getVisibleTimeRange`
   / `#groupSlotsByPartOfDay` are gone along with their tests.

---

## Design sync — one mockup still unmatched

`design/initial prototype/` holds nine independently-generated mockups. The 2026-09-01
sync pass matched the visual language of six of them; the two registration screens were
then built field-for-field on 2026-09-05 (`/auth/consumer-registration`,
`/auth/provider-registration`). Account settings for consumer and provider landed next
(`/consumers/profile`, `/providers/profile` + nested tabs). One dashboard mockup remains:

| Mockup | Route today |
|---|---|
| `provider_calendar_dashboard` | `/bookings` + `/providers/profile/analytics` — partly matched, see below |

**Partly matched on 2026-09-09.** The bookings calendar — then `/providers/profile/bookings`,
top-level `/bookings` since 2026-09-23 — and `/providers/profile/analytics` build the
mockup's substance — a month calendar that filters
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

- **No CI workflow.** There is no `.github/` directory at all. Now that `pnpm verify` is
  one command that needs no database and no secrets, a workflow is about 25 lines:
  `pnpm install --frozen-lockfile && pnpm verify`. Until it exists, the gates and the
  server typecheck run only when someone remembers — the Husky pre-commit hook still only
  runs `eslint --fix` on staged files.
- ~~**`pnpm typecheck` does not cover `server/`.**~~ — done 2026-09-11. The five
  `InputJsonValue` errors this entry listed in `server/src/routes/providers.ts` were
  already fixed by the email/password identity work; `tsc -p server` exits 0. The gap that
  remained was that nothing ran it. `pnpm typecheck:server` now exists and `pnpm verify`
  runs it second, so the API cannot drift unchecked again. The root `tsconfig.json` still
  excludes `server/` — that is correct, the two packages have different `module` settings.
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
- ~~**No `.gitattributes`.**~~ — added 2026-09-11, `* text=auto eol=lf`. Seven files had
  been committed with CRLF against ~500 with LF; `git add --renormalize .` folded them in
  as part of the same change, so the warning is gone rather than merely suppressed.
- **E2E is scaffolded, not written.** `tests/e2e/smoke.spec.ts` proves the harness runs;
  the email/password sign-in flow, booking slot selection, and provider profile edit are the specs worth
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

### ~~The web app's auth funnel does not match the API~~ — done 2026-09-11

The client half of the email/password + Google migration shipped. `/auth/sign-in`,
`/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/callback` and
`/auth/complete-registration` exist; `src/api/auth/*` and the auth store speak the new
contract; both registration screens collect an email and a password and offer Google; and
`phone-number-input`, `code-input`, `profile-created` and `src/helpers/localStorage.ts` are
deleted. The seven entry points that pointed at the OTP screen — Header, Footer, three
landing CTAs, `proxy.ts`, `axiosInstance`'s 401 redirect, `AccountSettingsLayout` and the
PWA manifest shortcut — all point at `/auth/sign-in`.

Verified live against the running API: sign-in returns a session, registration answers
`{ value: true }` with **no `Set-Cookie`**, an unverified account is refused with code
`4002`, `forgot-password` answers identically for known and unknown addresses, and
`PATCH /identity/phone` writes without an OTP. `Auth` is translated in all 15 catalogues.

One thing found while wiring it, worth remembering: the client password rules originally
checked only length, while `validatePassword` on the server also requires a letter **and** a
digit and forbids the email's local part. A password the server rejected therefore passed
client validation and failed on submit with a message the form had never shown.
`usePasswordRules` (`src/hooks/`) now mirrors the policy rule for rule — **a partial mirror
is worse than none**.


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

## Explore — the two filters that are still left out

`GET /providers` (2026-09-08) filters on search, category, `available` and
`openToday`, and sorts on name / `updatedAt` / `createdAt` / `ratingScore`. Two controls
the prototype implies are **deliberately absent**, each because the data to back it
cheaply does not exist yet. Do not add one without the column it needs:

| Control | Blocked on | What a naive version would cost |
|---|---|---|
| Price range | `Service.price` is per-service and `Service.currency` is free-form | A `price <= N` across mixed currencies is not a wrong-ish answer, it is a wrong one. Wants a currency table, or prices normalised to minor units in one currency. |
| Location / distance | `Provider.address` is free text, `locationUrl` is a Maps link | `contains` on an address string matches text, not places — a radius search that is not one. Wants lat/lng columns and geocoding at write time. |

**Rating was the third, and shipped on 2026-09-15.** It was blocked on exactly the column
this file named: `Provider.ratingAvg` / `ratingCount` / `ratingScore` are now denormalised
and rewritten on review writes (`server/src/services/reviews.ts#recomputeProviderRating`),
so `recommended` ranks on rating and `topRated` exists, both reading one index rather than
aggregating per page. The star badge is on the card.

A minimum-rating **filter** is still absent, and now for a different reason than "no
column": the score is Bayesian, so "4 stars and up" would hide a provider whose two
genuine 5★ reviews have not yet outweighed the prior. A filter on `ratingAvg` instead
would contradict the ordering next to it.

Also missing from the card versus the prototype: **"Next: Today, 2 PM"**. That is one
`getProviderAvailability` call per card per render — the shape the whole paged query was
built to avoid. It wants a cached `nextAvailableAt`, invalidated on schedule and
appointment writes.

## The root 404 is `DEFAULT_LOCALE` only

`src/app/not-found.tsx` serves every unmatched URL, and it renders *above*
`app/[lang]/layout.tsx` — so there is no `[lang]` segment, `next/root-params` has nothing
to read, and the requested locale is genuinely unknowable there. It reads the `Errors` and
`Common` catalogues at `DEFAULT_LOCALE`, so a visitor who mistypes `/es/proveedorez` gets
an English 404 inside a Spanish session.

Only the unmatched-URL case is affected. Every `notFound()` call inside `[lang]` — dead
provider, category and organization links, which is the traffic that actually happens —
renders `[lang]/not-found.tsx` with full chrome in the right language.

Closing it means either `experimental.globalNotFound` (Next flags it experimental, and it
bypasses the layout, so the shell would be duplicated a second time) or a proxy-set
pathname header the root page could read. Neither is worth it for a mistyped URL today.

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

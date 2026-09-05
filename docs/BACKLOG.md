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
| 3 | `ProviderServiceFormCategory.tsx:28` | `value.id` where `value` is a string → Formik stores `undefined` |

Scope: `ProviderProfileForm`, `ProviderServiceForm` + 4 sub-fields. See the `forms` skill
for the target pattern, and `src/app/auth/**` for worked examples — the whole auth funnel is
now antd-only.

**Resolved by the registration work** (2026-09-05): `AccountTypeButtons` is gone — the
account-type screen is two links, so there is no selection state to disagree about;
`phone-number-input/components/form.tsx` is antd-only; and `OTPCodeInput` no longer has a
nameless `Form.Item` outside a `<Form>`, no longer navigates identically on success and
failure, and no longer swaps the country code with the phone number on resend.

### 2. `splitScheduleIntoParts` mutates its caller's break objects

`src/helpers/schedule.ts` — `[...breaks]` is a shallow copy, so `last.end = …` writes
through into the original `DaySchedulePart`. Latent corruption under immer drafts.
Pinned by a regression test in `tests/unit/helpers/schedule.spec.ts`.

### 3. Smaller pure-logic defects (each has a test recording current behaviour)

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

---

## UI — remaining Phase 7

1. **`src/app/organizations/[organizationId]/loading.tsx` is missing.** Every other
   detail and list route has one.
2. **`active:` feedback states** — only 6 usages. `-webkit-tap-highlight-color: transparent`
   is set globally, so without them taps feel unregistered on custom-styled tappables.
3. **antd `style`/`styles` px leak sites** — `BackHistoryBtn.tsx:28`, the byte-identical
   `Divider`/`Space` pairs in `ProviderProfileFormCategories.tsx:44` and
   `ProviderProfileFormOrganization.tsx:44`, plus two CSS Modules.

---

## Design sync — three mockups still unmatched

`design/initial prototype/` holds nine independently-generated mockups. The 2026-09-01
sync pass matched the visual language of six of them; the two registration screens were
then built field-for-field on 2026-09-05 (`/auth/consumer-registration`,
`/auth/provider-registration`). Three describe a full dashboard shell — sidebar nav, a
notification bell, payment/2FA panels, notification-preference toggles — that the app
has no equivalent of at all:

| Mockup | Route today |
|---|---|
| `provider_calendar_dashboard` | No route — nothing built |
| `provider_account_settings` | `/providers/profile` — 9-line stub |
| `consumer_profile_settings` | `/consumers/profile` — 9-line stub |

Matching these is a feature build — a new sidebar layout primitive, a settings data
model, and payment/2FA/session-management backend work — not a styling pass, so it was
deliberately left out. Revisit as its own scoped task.

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
- **No `.gitattributes`.** Every git command warns `LF will be replaced by CRLF`.
  One line — `* text=auto eol=lf` — removes the noise permanently.
- **E2E is scaffolded, not written.** `tests/e2e/smoke.spec.ts` proves the harness runs;
  the auth OTP flow, booking slot selection, and provider profile edit are the specs worth
  having, and they need `pnpm db:up && pnpm db:setup && pnpm watch` first.

---

## Open assumptions

Each is a one-line reversal:

1. **`showLogo` defaults to `true`**, so top-level pages show the logo rather than a back
   arrow with nothing to go back to. Inverts in `getHeaderConfig` in `src/constants/header.ts`.
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

## Larger, deferred

**Split server data from UI state.** Stores currently own API calls while list pages also
fetch the same endpoints in Server Components. A cleaner split: Server Components own
first paint / SEO / JSON-LD; TanStack Query (or Next's `fetch` cache) owns client refetch
and mutations; Zustand keeps session, UI chrome, and unsaved drafts. `appendSelectors` is
worth keeping for the UI stores either way.

Note `useSingleProviderStore` is hydrated with `JSON.parse(JSON.stringify(initialState))`
*after* the page has already fetched — a store that is only a cache of a Server
Component's props is the clearest case for this split.

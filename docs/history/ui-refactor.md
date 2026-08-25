# UI/UX responsive refactor — completed work

Historical record of the refactor that ran on branch `ui-refactoring` and finished in
commit `90499df`. **Phases 0–7 are complete.**

Live content that used to be in this document now lives in three places:

- **Invariants and traps** → [`src/styles/CLAUDE.md`](../../src/styles/CLAUDE.md)
- **Component inventory and how to build a page** → the `design-system` skill
- **What is still outstanding** → [`docs/BACKLOG.md`](../BACKLOG.md)

Everything below is kept for the reasoning, not as instructions.

---

## Why this refactor

The app was not meaningfully responsive, for structural reasons rather than cosmetic ones:

- **`src/app/layout.tsx` had no `viewport` export.** Mobile browsers rendered at ~980px and scaled the desktop layout down, so no responsive style in the app was visible on a real phone. This was the single highest-leverage fix.
- **Three competing breakpoint scales**: Tailwind defaults (640/768/1024/1280/1536), `src/styles/commons.css` (768/992/1200/1400), and Ant Design v6's `screen*` tokens (480/576/768/992/1200/1600/**1920**). Only 5 responsive-variant usages existed in all of `src/`, all `md:`.
- **Four sources for `#18294D`**: `globals.css`, `App.tsx` ConfigProvider, `full-calendar-override.css`, and an inline style in `Calendar.tsx`.
- **No max-width container anywhere.** Content ran edge-to-edge behind a flat `p-4`; the hand-rolled grid reached **8 columns at 1400px (~161px per card — narrower than the phone card)**.
- **No design system.** Two colours, no font configured at all, no spacing/radius/shadow/type tokens, and `body { color: var(--primary-color) }` painted *all* text navy. `colorTextSecondary` equalled `colorTextBase`, so every `Typography type='secondary'` had zero de-emphasis. No `:focus-visible` style existed.

### Confirmed decisions (from the user)

| Decision | Choice |
|---|---|
| Scope | Foundation + every page with real content. Stubs get a correct responsive shell only. |
| Breakpoints | Collapse to **Ant Design's** scale; bend Tailwind to it. |
| Dark mode | **Dropped entirely.** Single light palette, no toggle, no `darkAlgorithm`. |
| Calendar | **Keep FullCalendar at all widths** and fix it (clamp hours, fluid height, per-breakpoint slot sizing, no nested scroll). |

---


## Bugs fixed that were not responsive issues

These were found while working and are worth knowing about:

| Bug | Where | Impact |
|---|---|---|
| `dayjs(x, 'HH:mm')` without `customParseFormat` | `src/helpers/schedule.ts` | Invalid Date → `splitScheduleIntoParts` always returned `[]`, so the "Current Schedule" summary **never displayed anything**. |
| Times written with `.format('hh:mm')` — 12-hour, no meridiem | `ProviderProfileWeekSchedule.tsx` | 14:30 stored as `"02:30"`. **Silent data corruption for every afternoon time.** Now `SCHEDULE_VALUE_FORMAT = 'HH:mm'` for storage, `'hh:mm A'` for display. |
| `events={selectedDate ? … : []}` with `selectedDate` only set by `dateClick` | `Calendar.tsx` | A visitor saw **zero slots** until they happened to tap an empty 40px cell in a 1920px-tall scroll region. Worst bug on the conversion path. Now defaults to today. |
| `getOrganization: '/organizations/'` + caller adding another `/` | `src/api/organizations/endpoints.ts` | `/organizations//<id>` → **404, the whole organization detail page was broken.** |
| `loading={true}` hardcoded | `ProviderServices.tsx` | Every service card was a permanent skeleton — the feature had never been visible. |
| `onEditServiceClick` stored `providerId`, not `serviceId` | `ProviderServices.tsx` | "Edit" always opened a blank create form. Now loads the clicked service into both formik and the antd form. |
| `if (onEntityClick) return onEntityClick` | `useEntityClickHandler.ts` | Returned the handler instead of calling it. |
| `prisma/seed.ts` never loaded dotenv (unlike `src/config.ts`) | `server/prisma/seed.ts` | `pnpm db:setup` failed with "Environment variable not found: DATABASE_URL". |
| Delete-service modal said "delete this **image**" | `ProviderServices.tsx` | Wrong copy. |
| `<AppFormItem name='title'>` wrapping `<AppInput name='firstName'>` bound to `values.name` | `ProviderServiceForm.tsx` | Three names for one field. |
| `className={\`mb-0! ${className}\`}` | `AppFormItem.tsx` | Emitted a literal `"undefined"` class at every call site. |

**Images were broken end to end**: the API returns root-relative `/uploads/<file>` but serves those files from its own origin, so Next requested them from itself and 404'd. `src/helpers/images.ts#resolveAssetUrl` prefixes the API origin, and `next.config.ts` now declares `images.remotePatterns`. Note the seed uses `imageUrl: '/logo.svg'`, so **the initials fallback is currently the common case** — that's why `AppAvatar`/`EntityCard` fallbacks had to look deliberate.

---

## What landed

### Phase 0 — cleanup and free fixes ✅

Deleted (all verified zero-importer or zero-byte): `src/components/Header.tsx`, `src/app/organizations/OrganizationCardDetails.tsx`, `src/constants/store.ts`, `src/api/_shared/*` (5 files), `test-lint-error.js`, `src/app/providers/ProvidersList.tsx`, `src/app/providers/[providerId]/components/ViewsDropdown.tsx`, `src/components/providerProfileForm/ProviderProfileFormItem.tsx`, `src/components/Footer.tsx`, `src/components/providerServiceForm/styles.module.css`.

Renamed `src/app/_loading.tsx` → `loading.tsx` (the underscore meant Next had never used it as a loading boundary). Added `'use client'` to `header/Header.tsx`. Removed both dead `d-block` classes, a `console.log`, a stray `{}` JSX expression. `notFound()` guard on `/routes-overview` in production. Corrected `.github/copilot-instructions.md` (said Redux Toolkit / thunks; the app is Zustand).

### Phase 1 — token foundation ✅

**New:** `src/styles/tokens.ts` (BRAND/NEUTRAL/STATUS ramps, RADII, CONTROL, BREAKPOINTS), `src/styles/theme.ts` (antd `ThemeConfig` with `cssVar: { prefix: 'ant' }`), `src/styles/fonts.ts` (Open Sans via `next/font`, variable `--font-app`), `src/helpers/cn.ts` (clsx + tailwind-merge), `src/components/dev/BreakpointInvariant.tsx`.

**Rewrote `src/styles/globals.css`**: breakpoint literals with `--breakpoint-*: initial` reset first, the `--ant-*` alias block, `@theme inline` Tailwind namespaces, brand ramp steps, container widths, a fluid semantic type scale (`text-display`/`text-h1`…`text-overline` with paired line-heights), base styles, and `tnum`/`app-gutter-x`/`app-safe-t`/`app-safe-b` utilities.

Deleted the `prefers-color-scheme: dark` block and both `dark:` classes. Declared `color-scheme: light`.

**The single biggest visual change** is two lines: `colorTextSecondary: NEUTRAL[600]` in the theme, and `:where(p, li, dd) { color: var(--brand-text-muted) }` in globals. Text hierarchy now exists where it previously did not.

`layout.tsx`: added the `viewport` export (`viewportFit: 'cover'`, `interactiveWidget: 'resizes-content'`, `themeColor`, `colorScheme: 'light'`, no `maximumScale`), font variable on `<html>`, and `manifest`. Added `src/app/manifest.ts`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` — all generated via `ImageResponse` from `src/components/brand/BookieMark.tsx`, so no binary assets were needed and the OG image is now a real PNG instead of an SVG most platforms refuse to render.

`eslint.config.mjs`: added `viewport`, `dynamic`, `revalidate` to `allowExportNames`.

Migrated all 7 `ui/App*` primitives to `cn` and the new tokens; deleted `combineClassNames`.

**Verified:** every `--ant-*` name in the alias block resolves in the built HTML; `md:` now emits `min-width: 768px` rather than Tailwind's default `48rem`, and `64rem`/`80rem`/`96rem` are absent — proof the breakpoint override took effect. `prefers-color-scheme` count is 0. `--font-app: "Inter", "Inter Fallback"` confirmed loading.

### Phase 2 — shell and layout primitives ✅

`src/components/App.tsx` is now a **single document-level scroller**. The old shell was `h-dvh` with two nested `overflow-auto` wrappers, which cost a second scrollbar, iOS momentum scrolling, URL-bar collapse and scroll restoration — and made `position: sticky` impossible anywhere. Also wrapped in antd `<App component={false}>` so `App.useApp()` works without adding a DOM node, plus a skip link.

**New primitives** in `src/components/ui/layout/`: `Container` (6 widths, fluid safe-area gutters), `PageShell` (`flow`/`fill`), `Section`, `PageHeader`, `ResponsiveGrid`, `Stack`, plus barrels. Also `EmptyState`, `ErrorState`, `ContactActions`, `AppAvatar`, `EntityCard`, `icons.tsx`, `skeletons/CardGridSkeleton`.

`<main>` deliberately carries **no** container — each page picks its own width via `PageShell`, so an auth form stays narrow while a card grid goes wide. Every page was migrated accordingly, and `src/app/auth/layout.tsx` now covers all five auth screens with one full-height narrow column (`justify-between` on phones puts the CTA at the thumb line, `md:justify-center` centres it).

The barrel `src/components/ui/index.ts` exports **only antd-free primitives** — antd v6 marks ~292 `es/` modules `"use client"`, so re-exporting antd wrappers would pull the runtime into any route importing an `AppTitle`.

### Phase 3 — header and navigation ✅

Replaced the CSS checkbox-hack drawer with antd `Drawer`. The old hamburger animation was dead code: Tailwind's `peer-*` compiles to a **sibling** combinator, but the icon bars were *descendants* of the label. The rewrite is *less* code — `navToggleRef`, `mobileNavRef`, the outside-click effect and the route-change effect all deleted — and gains focus trap, scroll lock, `aria-expanded` and focus restoration for free.

**New:** `src/helpers/routes.ts` (longest-prefix `matchRouteName`, `isRouteActive`), `src/hooks/useHeaderConfig.ts`, `src/components/header/NavLinks.tsx` (route list rendered once, shared by desktop nav and drawer — previously duplicated verbatim), `MobileNav.tsx`, `src/components/layout/SkipLink.tsx`.

Fixed the real back-arrow bug: `ROUTE_KEYS_BY_VALUES` matched **exact static paths only**, so on `/providers/abc` the key was `undefined` and both `Header` and `BackHistoryBtn` were independently producing the right answer *by accident*. `BackHistoryBtn` also now falls back to a route instead of navigating off-site when there is no history.

Header is sticky with backdrop blur (only possible after the Phase 2 scroll fix). `--spacing-header` is one `@theme` declaration serving both the `h-header` utility and `calc()`. "Sign on" promoted from an underlined link identical to "Contact" to a filled button. `categories`/`contact` removed from nav until those pages hold real content.

### Phase 4 — grid and cards ✅

Deleted `src/styles/commons.css` entirely and its import. Beyond the wrong column counts it had a **hole between `max-width: 767px` and `min-width: 768px`** — both fail at fractional widths like 767.5px, which occur constantly under browser zoom and Windows display scaling, leaving the width vars unset.

`ResponsiveGrid` uses `repeat(auto-fill, minmax(min(17rem,100%),1fr))`. The inner `min(…, 100%)` is load-bearing: a bare `minmax(17rem,1fr)` overflows any container narrower than 17rem, and 320px minus gutters is 288px. Column counts now 1 → 2 → 3 → 4, self-capped by `max-w-content` rather than by a breakpoint table.

One `EntityCard` replaced five divergent card shapes (provider, organization, category, service). It provides equal heights (`h-full` + flexed body), a fixed image aspect box so card heights stop tracking source image dimensions, line-clamped text, and a **stretched link** — the old `CategoryCard` nested buttons inside an `<a>` (invalid HTML, broken keyboard nav) and `ProviderCard`'s anchor excluded its own cover image. Deleted `CategoryCardDetails.tsx` and `OrganizationCardDetails.tsx` (the latter also accepted `hideCategories` and silently ignored it).

`categories/[categoryId]` now renders through the same `ResponsiveGrid` as the list pages — the same card used to be full-width there and 1/8 width on `/providers`.

### Phase 5 — detail pages and calendar ✅

`providers/[providerId]`: `PageHeader` with `media` ordered above the title on mobile and beside it from `md` (one set of markup, `md:order-last`) — the old `flex items-start` row never wrapped, squeezing the text column to ~120px on a phone. Category/org chips became wrapped `Tag`s instead of a vertical stack of underlined links. The four hand-built label/value blocks became antd `Descriptions` with `column={{ xs: 1, md: 2 }}`. Added `ContactActions` (Call / Directions / Email) — `generateGoogleMapsLink` already existed and was used on the org page but **not** here, so the provider address was unlinked plain text. Raw `<img>` → `next/image` in an aspect box.

`organizations/[organizationId]`: same treatment plus a Website action and a logo `AppAvatar`.

`Calendar.tsx`, per the "keep FullCalendar, fix it" decision:
- `selectedDate` defaults to today (the zero-slots bug above).
- `slotMinTime`/`slotMaxTime` derived from the provider's own `weekSchedule` via new `src/helpers/booking.ts#getVisibleTimeRange` (±1h padding, 09:00–18:00 fallback). 48 rows → ~11.
- Real availability from `getSlotsForDate`, which reuses the existing `splitScheduleIntoParts` (availability minus breaks) and steps by the selected service's duration.
- `height='auto'` + `expandRows` replacing the fixed `h-[800px]` that contained 1920px of grid; no nested scroll container.
- `slotDuration` 1h below `md`, 30min above, via `Grid.useBreakpoint()` (first use in the repo) — now sharing our one breakpoint scale.
- Slot colours inverted: a solid fill reads as *busy* in calendar convention, so available slots are a light tint.
- Service picker added (`Segmented` ≥sm / `Select` on phone). It previously grabbed `services.allIds[0]` and showed "Select a service before booking" *after* a failed tap — an error for a choice the UI never offered.
- `useMemo` on slot generation (was rebuilding on every unrelated render), hardcoded `locale='hy-am'` removed, unused `listPlugin` dropped, inline `#18294D` replaced with the token, `full-calendar-override.css` moved here from the page and de-hexed to `var(--ant-*)`.

Also added `src/app/error.tsx`, `global-error.tsx` (own `<html>/<body>`, inline styles, **cannot use antd** — it renders outside `ConfigProvider`), restyled `not-found.tsx` as a `Result`, and de-duplicated the two byte-identical segment `error.tsx` files onto `ErrorState`.

---


## Environment notes

The seeded local stack works. What I had to do to get there:

```bash
cp server/.env.example server/.env    # placeholders only; matches docker-compose creds
pnpm db:up                            # needs Docker Desktop running
pnpm db:setup                         # migrate + seed (needed the dotenv fix above)
pnpm watch                            # web :4141 + api :4142
```

Seed credentials: dev OTP `123456` for all phones; provider `+37477000100`, consumer `+37477000201`.

Verification commands, in the order that fails fastest:

```bash
pnpm typecheck   # run before build; catches prop churn quickly
pnpm lint        # `pnpm lint-fix` for the simple-import-sort churn
pnpm build
```

`@theme` edits sometimes need a turbopack restart — if a breakpoint seems ignored, restart before debugging.

**There are no CI workflows** in `.github/` (only instruction files). A `typecheck + lint + build` workflow is the only guard against a `'use client'` regression like the one Phase 0 fixed — worth adding.


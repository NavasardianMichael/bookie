# Responsive UI/UX Refactor — Handoff

**Branch:** `ui-refactoring`
**Status:** Phases 0–5 substantially done. Phases 6–7 remain.
**Green as of handoff:** `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass; every route verified rendering against a live API + seeded DB.

The full original plan lives at `~/.claude/plans/ui-needs-refactoring-witty-fog.md`. This file is the delta: what actually landed, what is left, and the traps found along the way.

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

## Architecture: one owner per value

```
src/styles/tokens.ts        ← the ONLY file where a hex or magic px may appear
      │
      ├─→ src/styles/theme.ts ─→ ConfigProvider theme={…} cssVar:{prefix:'ant'}
      │                                  │
      │                                  └─→ antd emits :root{--ant-color-primary: …}
      │                                            │
      │        globals.css alias block ────────────┘   (§2 — the ONLY place
      │              │                                 allowed to name --ant-*)
      │              └─→ @theme inline ─→ Tailwind utilities (bg-brand, text-brand-muted…)
      │
      └─→ the rare JS consumer (Calendar event colours, generated icons)

Breakpoints: antd v6 defaults, NEVER overridden  ←→  globals.css @theme literals (only site)
```

**Why breakpoints are the one exception to derivation** — verified in `node_modules`, both directions are impossible:

- antd's `theme/useToken.js` lists all 21 `screen*` tokens in a `preserve` map, so cssinjs never emits them as CSS variables — `_util/responsiveObserver.js` feeds them into `window.matchMedia()` as JS numbers.
- Tailwind's `--breakpoint-*` compile into `@media (width >= X)`, and **media queries cannot resolve `var()`**.

So single-source is achieved by *deletion*: adopt antd's scale, override **zero** `screen*` tokens, declare the numbers once as Tailwind literals. `src/components/dev/BreakpointInvariant.tsx` asserts the mirror in development.

Breakpoint literals are **`px`, not `rem`** on purpose: media-query `rem` is relative to the browser's *default* font size while antd's `matchMedia` strings are `px`, so a user raising their default font size would silently desync the two.

---

## Traps found (read before touching this code)

1. **The `!`-suffix debt cannot be fixed by import order or `@layer`.** `@import 'tailwindcss'` puts utilities in `@layer utilities`; `antd-override.css` and antd's runtime cssinjs `<style>` blocks are **unlayered**, and unlayered declarations beat layered ones in the cascade. The only durable fix is moving those values into antd tokens — which is what `controlHeightLG: 48` and `Form.itemMarginBottom: 0` do.
2. **`--font-sans` collides with Tailwind v4's own default theme variable.** `:root` and next/font's generated class have identical specificity, so the winner depended on stylesheet order. The app font is exposed as **`--font-app`** and `globals.css` maps Tailwind's `--font-sans` onto it.
3. **`@ant-design/icons` is client-only** (it uses `createContext`). A Server Component importing it fails at *build* time, not runtime. Server-safe inline SVGs live in `src/components/ui/icons.tsx`; use antd icons only inside `'use client'` components.
4. **antd seed colours must be literal hex.** `colorPrimary` is fed to antd's palette generator to derive Hover/Active/Bg variants; a `var()` string produces garbage swatches.
5. **Tailwind v4 tree-shakes unused `@theme` variables.** `--text-h1`, `--breakpoint-xxl` etc. only appear in the output once something uses them. `BreakpointInvariant` treats `NaN` as "not used yet", not a mismatch.
6. **`next-env.d.ts` is gitignored and only generated by a build.** On a fresh clone `pnpm typecheck` fails on `@assets/images/verified_icon.png` until you run `pnpm build` once. Not a code bug.
7. **`generateImageMetadata` in `icon.tsx` did not pass `id`** the way the docs implied (`borderRadius: NaN` → build failure). Reverted to a single 512px `icon.tsx`.
8. **Container width classes must be static strings in a lookup object**, never template interpolation — Tailwind v4 scans source text and will not generate an assembled class.

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

**New:** `src/styles/tokens.ts` (BRAND/NEUTRAL/STATUS ramps, RADII, CONTROL, BREAKPOINTS), `src/styles/theme.ts` (antd `ThemeConfig` with `cssVar: { prefix: 'ant' }`), `src/styles/fonts.ts` (Inter via `next/font`, variable `--font-app`), `src/helpers/cn.ts` (clsx + tailwind-merge), `src/components/dev/BreakpointInvariant.tsx`.

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

## What is left

### Phase 6 — forms and modals (not started)

1. **Delete the remaining 7 `h-[56px]`** — `controlHeightLG: 48` in `theme.ts` already makes them redundant. Locations:
   - `src/app/auth/code-input/OTPCodeInput.tsx:149`
   - `src/app/auth/phone-number-input/components/form.tsx:102,120,126`
   - `src/components/providerProfileForm/ProviderProfileForm.tsx:124`
   - (two are comment references in `theme.ts` / `tokens.ts` — leave those)
2. **OTP row overflows every phone.** 6 × 56px + 5 × 8px gap = **376px** of content needing a ~408px viewport; it breaks iPhone 15 (390px) and all 360px Androids. Delete the `.ant-otp-input-wrapper input` rule from `src/styles/antd-override.css` and use antd v6's semantic slot: `<Input.OTP size='large' className='w-full' classNames={{ input: 'min-w-0 flex-1 aspect-square' }} />`. **`min-w-0` is essential** — flex items will not shrink below an input's intrinsic width without it, which is the actual cause. Also add `inputMode='numeric'` and **`autoComplete='one-time-code'`** (gives iOS/Android the SMS autofill — biggest completion-rate lever in the funnel, one attribute). Move the `Countdown` out of the button; it is `absolute right-[6px]` *inside* a full-width primary button, colliding with the label at 320px and polluting the button's accessible name.
3. **Phone input**: replace the `w-[130px]` Select + `border-r-0!`/`rounded-l-none!` + `.custom-antd-select` CSS with antd `<Space.Compact className='w-full'>`, which handles the joined border/radii natively. That deletes `.custom-antd-select`, its `:has()` companion, and ~6 `!`s. Then **`src/styles/antd-override.css` can be deleted entirely** and its import removed from `layout.tsx`. Also add `showSearch` + `popupMatchSelectWidth={320}` (≈240 countries, currently no search, in a 120px-wide dropdown) and shorten the `Enter number without +${code}` placeholder, which overflows.
4. **`ProviderProfileForm`**: 10 stacked full-width fields. Add a `src/components/ui/AppFormSection.tsx` and group into About you / What you do / Where / When you work / Optional, pairing `firstName`+`lastName` and `email`+`organization` at `Col xs={24} md={12}`. Keep wide controls full-width. A wizard is **not** worth it (routing + per-step validation + draft persistence, and it sits right after signup where extra navigation is a drop-off surface). Add a sticky bottom action bar below `md`. Delete `onSubmitButtonClick` — it scrolls to `'lastName'` when `categoryIds` errors, and `scrollToFirstError` already works correctly now that global `scroll-margin-top` is set.
5. **`ProviderProfileWeekSchedule`**: the only `Row`/`Col` in the repo, fixed `span={8}` with no gutter — at 360px "wednesday" gets ~100px and wraps under its checkbox. Minimum: `<Row gutter={[8,8]}>` + `<Col xs={12} sm={8} lg={6}>`. Better: one row per day with a `Switch` and a `tnum` summary, and render the edit modal as a bottom `Drawer` below `md` (antd's time panel is unusable in a `centered` Modal on a 667px-tall phone).
6. **`src/components/ui/AppSheet.tsx`**: `Grid.useBreakpoint()` → `Modal width='min(40rem,100%)' footer={null}` at `md+`, `Drawer placement='bottom' height='92dvh'` below. Use it for the two `ProviderServices` modals, replacing `className='p-2! max-h-[97vh]! overflow-auto' wrapClassName='m-auto'` and the `okButtonProps={{className:'hidden!'}}` / `cancelButtonProps` pattern (hidden footer buttons are focus-order landmines).
7. `ProviderServiceForm`: pair `price`/`currency` and `duration`/`categoryId` at `Col xs={24} sm={12}` — gate on `sm`, not `md`, since it lives in a 40rem sheet.
8. `AccountTypeButtons`: `Radio.Group optionType='button'` with `w-full flex! gap-2!` and per-option inline styles → antd `Segmented block`. The logo is `h-[200px] md:h-[400px] object-cover` — `object-cover` on an SVG distorts it and 400px is ~60% of a laptop viewport; use `max-h-[40vh] w-auto object-contain`.

### Phase 7 — states, a11y, polish (partially done)

Done: root `loading.tsx` with `CardGridSkeleton`, `EmptyState` on `/providers`, `/organizations`, `/categories/[id]`, `/categories`; `error.tsx` + `global-error.tsx` + restyled `not-found.tsx`.

Remaining:
1. **Segment-level `loading.tsx`** for `/providers`, `/organizations`, `/categories/[categoryId]`, `/providers/[providerId]`, `/providers/profile-services`. These matter: all are `force-dynamic` with **uncached axios** calls, and axios is not deduped by Next's `fetch` cache, so each detail page makes **two** round-trips (one in `generateMetadata`, one in the page). Wrapping those in React `cache()` is a real TTFB win and worth doing.
2. **`EmptyState` on `/providers/profile-services`** — this is the *default* state for every new provider, currently a blank screen with one outline button.
3. **`aria-label` on the ~10 icon-only `Button type='text'`** instances (edit/delete service, remove gallery image, remove location URL). `jsx-a11y` misses these because antd renders the icon as a child. Add `min-h-11 min-w-11` to each.
4. **`active:` feedback states** on custom-styled tappables — `-webkit-tap-highlight-color: transparent` is now set globally, so without them taps feel unregistered.
5. `enterKeyHint` / `inputMode` / `autoComplete` across the remaining form inputs.
6. Optionally wire `/categories` for real: `getCategoriesListAPI` exists and `CategoriesList.tsx` + `CategoryCard.tsx` are already written and migrated to `EntityCard`/`ResponsiveGrid` — the page just needs to render `<CategoriesList/>`. Roughly half a day, and it removes the last nav dead-end. Currently a "Coming soon" `EmptyState`, and `categories` is pulled from `HEADER_ROUTES`.
7. Home `/` is still a bare `<h1>` inside a `PageShell`. A hero + category chip row + first-8-providers section would reuse everything already built.

### Not yet verified (needs a real device or browser session)

Everything below was out of reach from the CLI:

- **Breakpoint sweep.** Test at each breakpoint **and one pixel below** — off-by-one boundary bugs are exactly what a three-scale codebase produces: `320 · 360 · 390 · 479/480 · 575/576 · 767/768 · 991/992 · 1199/1200 · 1440 · 1599/1600 · 1920 · 2560`, plus **844×390 landscape** for the `dvh` math.
- **Overflow detector**, paste in the console at each width:
  ```js
  [...document.querySelectorAll('*')]
    .filter((el) => el.scrollWidth > document.documentElement.clientWidth + 1)
    .forEach((el) => { el.style.outline = '2px solid red'; console.log(el.scrollWidth, el) })
  ```
- **Keyboard pass**: skip link → `#main`; Drawer opens with Enter, traps focus, closes on Escape, returns focus to the hamburger; `aria-expanded` flips; visible focus ring at every stop.
- **`BreakpointInvariant` console output** should be silent in dev.
- **Real iOS Safari** — the one thing DevTools cannot fake: safe-area insets with `viewportFit: 'cover'`, `dvh` as the URL bar collapses, momentum scroll after the nested-scroll fix.
- **Real Android Chrome** — soft keyboard vs `interactiveWidget: 'resizes-content'` on the phone, OTP, profile and service forms.
- **Card equal-heights** with a long provider name *and* a missing image.
- **Lighthouse mobile** — the "content wider than screen" audit failed purely from the missing `viewport` export; CLS should now be ~0 with every image in an aspect box.

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

### Grep gates

```bash
grep -rn "app-responsive-flex" src     # 0 ✅
grep -rn "d-block" src                 # 0 ✅
grep -rn "combineClassNames" src       # 0 ✅
grep -rn "dark:" src                   # 0 ✅ (permanently)
grep -rn "bookie-blue\|bookie-gray" src # 0 ✅
grep -rni "18294d" src | grep -v tokens.ts  # 2 — both comment references, fine
grep -rn "h-\[56px\]" src              # 7 → target 0 in Phase 6
grep -rnoE "[a-z0-9)\]]!'" src --include=*.tsx  # 3 → target ~0 in Phase 6
```

---

## Open assumptions

Each is a one-line reversal:

1. **`showLogo` defaults to `true`**, so top-level pages show the logo rather than a back arrow with nothing to go back to. Previously the effective default was `false`. Inverts in `getHeaderConfig` in `src/constants/header.ts`.
2. **No mobile bottom tab bar.** With `categories`/`contact` as stubs there were effectively two real destinations plus a sign-on CTA; a bottom bar would duplicate the nav and need suppressing in the auth funnel. `<main>` already carries `app-safe-b`, so adding one later is purely additive.
3. **Inter has no Armenian subset.** `Calendar.tsx` previously hardcoded `locale='hy-am'` (now removed). If Armenian is a real target market, add `Noto_Sans_Armenian` (`subsets: ['armenian']`) to the stack in `src/styles/fonts.ts` — otherwise Armenian text renders in a fallback face.

# Components — invariants

Reuse before creating. The `design-system` skill has the full inventory and the
page-building procedure; this file is the decision rule and the boundaries.

## antd vs custom — the rule is not aesthetic

It is **`"use client"` and what HTML a crawler sees.** antd v6 marks ~292 of its `es/`
modules `"use client"`, so an antd component's text only reaches the DOM after hydration.

| Use custom (`ui/bare/`, `ui/layout/`) | Use antd |
|---|---|
| **Content** — headings, body copy, links, times, description lists, JSON-LD | **Interaction** — Button, Input, Select, Form, Modal, Drawer, Upload, TimePicker, Segmented |
| It renders in a Server Component (`page.tsx`, `layout.tsx`) | It already lives inside a `'use client'` island |
| Page structure — Container / PageShell / Section / PageHeader / ResponsiveGrid / Surface / ChipRail / Pagination / SettingsShell | antd already supplies focus trap / scroll lock / a11y |
| An icon that must paint in a Server Component, or that antd does not have | An icon in a `'use client'` island → `@ant-design/icons` first |

**Icons — try `@ant-design/icons` first.** It uses `createContext`, so a Server Component
that imports it fails at **build** time — the only reason `ui/icons.tsx` exists. Use
`ui/icons.tsx` only when the glyph must be in the crawler's HTML or antd has nothing close
(`StarIcon`, a fill so the `RatingStars` clip works). Model: `ReviewCardActions`.

## The three tiers

```
ui/bare/      antd-free BY CONTRACT — server-renderable. Never import antd here.
ui/layout/    antd-free page structure. Same contract.
ui/           antd wrappers — client islands (AppButton, AppInput, AppTextArea, AppFormItem,
              AppSheet, AppConfirmModal, CopyableLinkValue, ErrorState, ErrorAlert)
```

**`ui/index.ts` re-exports only `./bare` and `./layout`, deliberately** — an antd wrapper
there would pull antd's runtime into every route that merely wants an `AppTitle`. Import
wrappers from their own path.

Feature folders outside the tiers:

- `errors/` — error *wiring*: `RouteErrorFallback` (body of every `error.tsx`),
  `UnhandledErrorListener`, `RefreshButton`. See *Errors* below.
- `plans/` — shared by `/pricing` and the Plan tab. `PlanComparisonTable`, `AddonCatalogue`,
  `PricingIncluded`, `PricingFaq` are antd-free so `/pricing` renders everything into the
  HTML; `PlanPrice` / `AddonPrice` are the hydrating cells (`usePlanPrices`).
  `PlanUpgradeSheet` is the request form for what is not `purchasable`; otherwise buying is
  `useStartCheckout`. See `docs/BILLING.md`.
- `bookingImport/` — *Add from photo* on `/bookings`; slot rules are `@helpers/bookingImport`.
- `legal/LegalDocument` (antd-free), `brand/PoweredByBookie` (reads the plan-neutral
  `details.showPoweredBy`, never the plan), `settings/TelegramConnect` and
  `settings/CalendarFeed` (each saves on its own button, outside the tab's Save).

Antd-free primitives worth knowing — reach for them, do not re-derive them:

- **`bare/BarChart`, `StatTile`** — numbers known before render go in the HTML. Drawn in
  divs, not SVG. One series = one colour, only the peak labelled, an `sr-only` `<table>` as
  the accessible alternative. **No charting library**; do not add one.
- **`bare/RatingStars`** — whenever a rating is *displayed* (antd `Rate` only for entering
  one, inside a client island). Value clamped to 0–5; a partial star is a clipped gold row
  over a grey one (`w-max`, stars `shrink-0`). Colour is `--color-rating`, not
  `STATUS.warning`.
- **`layout/Pagination`** — real anchors via `buildHref(page)`, for every *public* list.
  antd's `Pagination` only inside an already-client admin island. Omit either kind below
  `PAGINATION_MIN_ITEMS` (10), and still render every row.

## Dialogs — never reach for antd `Modal` directly

| The dialog is | Use | Shape |
|---|---|---|
| A yes/no question — delete, discard, unpublish, cancel a booking | **`ui/AppConfirmModal`** | Centred 30rem modal on every viewport |
| A panel of content or a form the user works inside | **`ui/AppSheet`** | Modal ≥`md` (body capped at `80dvh`, scrollable), bottom Drawer below |

- **`AppConfirmModal`** forwards every `ModalProps` except `onOk` (it is `onConfirm`, may be
  async), `footer` and `title` (required). It adds a `tone` (`warning` / `danger`), type-
  scale title and `description`, `Common.*` button defaults, and an **awaited `onConfirm`**:
  the button goes busy and every dismissal route is locked until it settles. A rejection is
  shown through `useErrorToast` and the dialog stays **open** — so a call site's `onConfirm`
  has no try/catch of its own (see `ProviderServices.tsx`); copy of its own is a thrown
  `UserFacingError`.
- **`AppSheet`** takes `pending`: the close button stays visible but disabled, and mask and
  Escape are locked. The caller disables the actions inside.

Gated by `pnpm gates`: `<Modal` belongs to the two wrappers and nowhere else.

**Lazy-split an overlay only when it pulls a heavy module the page does not otherwise use
and is rendered after the user asks** — `next/dynamic` still downloads a component mounted
while closed. Confirm dialogs stay eager. Existing splits: `qrcode` (in `toQrDataUrl`),
`antd-img-crop` (`LazyImgCrop`), the booking confirm sheet, the service form, the
plan-request sheet, the week-schedule TimePicker editor, Paddle.js. Their fallback is antd
`Spin` at default size, centred (`LazyImgCrop` has none, on purpose); a route
`loading.tsx` stays a pulse skeleton, because it renders on the server.

## Errors — one pipeline, two audiences

A failure is written for two readers. **Production shows friendly, translated copy**, chosen
by what *kind* of failure it was (`Errors.kinds.*`) or by a stable code (`Errors.codes.*` —
the `AUTH_ERROR_CODES`, `BOOKING_ERROR_CODES`, `PLAN_ERROR_CODES`, slot taken), with Retry
where retrying can help and Reload where a deploy changed the page's code. **Development
shows the same copy plus the original error** — server message, `status · METHOD path ·
code`, stack — collapsed under *Developer details* (`bare/ErrorDetails`). The server's own
`message` is English and written for developers, so it never reaches a production reader.

Every surface below goes through `classifyError` (`src/helpers/error.ts`) and
`useErrorMessage` (`src/hooks/`). `SHOW_ERROR_DETAILS` (`src/constants/errors.ts`) is
`NODE_ENV !== 'production'`, so `next start` of a production build hides the details too.

| The failure | Use | Notes |
|---|---|---|
| A route segment's render or fetch threw | `error.tsx` → **`errors/RouteErrorFallback`** | Wires Next's **`retry`** (re-fetches), never `reset`. Pass `inline` inside a settings shell. See `src/app/CLAUDE.md`. |
| A panel has nothing to show because its load failed | **`ui/ErrorState`** | Full block (antd `Result`). Takes `error` for dev details. |
| Inline — a load, a save, a partial failure | **`ui/ErrorAlert`** | Takes the raw `error`, never a string. `onRetry` shows Try again only when the kind is retryable; `tone='warning'` for a partial failure the screen works around. |
| No inline home — a toggle, a delete, a background refresh | **`useErrorToast`** (`src/hooks/`) | antd `notification`; same copy, dev details and Retry. `key` collapses repeats. |
| Deliberately not shown (decorative badge, prefill, SW registration) | **`reportError`** (`src/helpers/`) | The one seam a monitoring client would plug into. Silent must never mean invisible. |
| Nobody handled it at all | `errors/UnhandledErrorListener` (mounted in `App.tsx`) | Toasts a failed API call or a stale build in production, everything in development. |

Four rules that keep it honest:

- **Store the error, not its message.** `useState<unknown>(null)` and `setError(err)`, so
  the surface can classify it. `processError(e).code` is still the way to *branch* on a code.
- **A load failure replaces what it would have filled.** A settings form that failed to
  load must not render its defaults — Save would write them over the real data — and a list
  that failed to load must not also say it is empty.
- **Copy of a call site's own** goes in as `overrides` (`{ 409: t('slugTaken') }`) or as a
  thrown `UserFacingError`. A **status** override does not beat a stable code's catalogue
  copy — only an override keyed on the code itself does (`resolveErrorText`).
- **`ErrorAlert` is the only inline error block.** No antd `Alert type='error'`, no
  `role='alert'` div.

Enforced by `pnpm gates`: no hand-rolled error blocks, no rendered
`processError(…).message`, and no `.catch(() => undefined)`.

## antd props go stale — read the type before you use one

antd 6.6.1 marks **199 props across 62 components** `@deprecated`, and TypeScript errors on
none of them. **Never write an antd prop from memory or a v4/v5 example** — Ctrl+click it,
or read `node_modules/antd/es/<component>/index.d.ts`. v6 keeps folding a flat family into
one object prop:

| Deprecated | Current |
|---|---|
| `onSearch`, `filterOption`, `filterSort`, `optionFilterProp`, `searchValue`, `autoClearSearchValue` — on `Select`, `AutoComplete`, `Cascader`, `TreeSelect` | `showSearch={{ onSearch, filterOption, … }}` — the object form also *implies* `showSearch`, so drop the bare flag |
| `dropdownClassName`, `popupClassName` | `classNames.popup.root` |
| `dropdownStyle` | `styles.popup.root` |
| `dropdownRender` | `popupRender` |
| `onDropdownVisibleChange` | `onOpenChange` |
| `dropdownMatchSelectWidth` | `popupMatchSelectWidth` |
| `bordered` (`Select`, `Input`, `InputNumber`, `Card`, `Cascader`) | `variant` |
| `addonBefore`, `addonAfter` (`Input`) | `Space.Compact` with the addon as a sibling; a named `Form.Item` must still wrap the real input (or a control-contract field that forwards `value`/`onChange`) |
| `showArrow` | now the default — hide it with `suffixIcon={null}` |
| `<Option>` children, `Select.Option`, `dataSource` | `options` |
| `bodyStyle`, `headStyle`, `Descriptions` `labelStyle`/`contentStyle` | `styles.*` |
| `Modal` `destroyOnClose`, `maskClosable` | `destroyOnHidden`, `mask.closable` |
| `Space` `direction`, `split` | `orientation`, `separator` |
| `Divider` `type`, `orientationMargin` | `orientation`, `styles.content.margin` |
| `Slider` `onAfterChange` | `onChangeComplete` |
| `Spin` `tip`, `wrapperClassName` | `description`, `classNames.root` |
| `Statistic.Countdown` | `Statistic.Timer type="countdown"` |

The table is a snapshot; `grep -rn "@deprecated" node_modules/antd/es/*/*.d.ts` is the
truth — re-read it after any antd bump. Enforced by `pnpm gates`; add a new name to the
list in `scripts/gates.mjs`. `Space direction=` and `Divider type=` are deliberately not
gated (those names are legitimate on our own components) — they stay a read-the-type check.

## Exports

Every component is a **named export declared inline** — `export const AppButton: FC<…> =` —
and barrels forward it by that name (`export { AppLink, type AppLinkTone } from './AppLink'`,
never `default as AppLink`). Nothing here is a framework entry point, so there are no
exceptions. Both rules are enforced by `pnpm gates`.

## A wrapper has to forward its ref

`AppButton` declares `ref` explicitly, because antd's `ButtonProps` does not carry one.
Without the declaration the wrapper cannot be *typed* as a `Dropdown` / `Tooltip` /
`Popover` trigger, which needs the child's DOM node. Any new antd wrapper that could be a
popup trigger needs the same two lines. (`ProviderServiceCard` still reaches past
`AppButton` to a raw `Button`; new code does not have to.)

## Styling

- Always route `className` through `cn` (`src/helpers/cn.ts` = `twMerge(clsx(...))`) —
  class order in the attribute does not decide precedence, so a primitive's default can
  only be overridden if `twMerge` removes it.
- Responsive variants are a **last resort**; prefer fluidity (`clamp()` type,
  `app-gutter-x`, `auto-fill/minmax` grids, `dvh`). The JS counterpart,
  `Grid.useBreakpoint()`, is used only in `AppSheet`.
- Spacing between form fields is the parent flex `gap` — `theme.ts` sets
  `Form.itemMarginBottom: 0`. No `mb-*!` classes.
- **Do not pass `size='large'`** on antd controls, wrappers, or `Spin`. The remaining call
  sites are the allowlist in `src/styles/CLAUDE.md` invariant 10; gated.

## Forms

Ant Design `Form` is the single source of truth for form state **and** validation — see the
`forms` skill. Formik was removed on 2026-09-11 and must not be reintroduced: two stores
fight, antd wins the render while Formik wins the submit.

## Client/server boundary

- Add `"use client"` only for hooks, store access, browser APIs, or interactivity.
- `src/app/global-error.tsx` renders **outside** `ConfigProvider` and cannot use antd.
- There is exactly one `ConfigProvider`, in `src/components/App.tsx`. Do not nest another.
  `locale` and `direction` are resolved on the server and passed down as props. `App.tsx`
  is also where `setDayjsLocale` is called — client-side only. See `src/i18n/CLAUDE.md`.

## Known non-canonical code — do not copy

- **Client islands still importing `ui/icons.tsx`** (`MailIcon`, `LockIcon`, `CopyIcon`, …)
  for stroke matching. A new icon on a client island is an `@ant-design/icons` import.

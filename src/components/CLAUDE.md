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

**Icons — try `@ant-design/icons` first.** `@ant-design/icons` uses `createContext`, so a
Server Component that imports it fails at **build** time — that is the only reason
`ui/icons.tsx` exists. When adding or editing a component, look up the antd name
(`FlagOutlined`, `CommentOutlined`, `PlusOutlined`, …) before drawing a path. Use
`ui/icons.tsx` only when the glyph must be in the HTML a crawler sees, or when antd has
nothing close (`StarIcon`'s fill, for the `RatingStars` clip). `ReviewCardActions` is
the current client model: `CommentOutlined` / `FlagOutlined` on a `'use client'` island.

## The three tiers

```
ui/bare/      antd-free BY CONTRACT — server-renderable. Never import antd here.
ui/layout/    antd-free page structure. Same contract.
ui/           antd wrappers — client islands (AppButton, AppInput, AppTextArea, AppFormItem,
              AppSheet, AppConfirmModal, CopyableLinkValue, ErrorState, ErrorAlert)
```

Outside the tiers, `errors/` holds error *wiring* rather than visuals — `RouteErrorFallback`
(the body of every `error.tsx`), `UnhandledErrorListener`, and `RefreshButton` (retry for a
Server Component that failed inline). See *Errors* below. `bare/ErrorDetails` is the
antd-free collapsible that shows the original error in development.

**`bare/BarChart` is antd-free for the same reason `StatTile` is** — a page whose numbers
are known before render should put them in the HTML, not produce them after hydration. It
is drawn in **divs, not SVG**: a bar chart is a row of rectangles on a shared baseline,
which CSS grid already does, and going through SVG would mean a `viewBox` and pixel
geometry when `src/styles/CLAUDE.md` puts every magic px in `tokens.ts`. The one inline
style in it is a bar's height, which is data rather than design.

Three rules it encodes, worth not undoing: **one series means one colour** (colouring the
tallest bar differently makes colour follow rank, so the chart repaints whenever the data
moves and the eye reads a category that is not there); **no number on every bar** — only
the peak is labelled, and only where the bars are wide enough; and the `sr-only` `<table>`
under the `aria-hidden` plot is the real accessible alternative, so a screen reader gets
the figures rather than a description of a picture of them. There is **no charting
library** in `package.json`; do not add one for a bar chart.

**`bare/RatingStars` exists for the same reason, and it is the one to reach for whenever a
rating is *displayed*.** antd's `Rate` is a `"use client"` module, and the two places a
rating appears — `ProviderCard` in the Explore grid, and the review section on a provider's
public page — are deliberately Server Components. Importing `Rate` into either would pull
antd's runtime into the bundle of every route that renders a provider card. `Rate` is still
the right control for *entering* a rating and is used inside the review form, which is a
client island already.

Two details in it worth not undoing: a partial star is drawn by overlaying a clipped gold
row on a grey one rather than by swapping in a half-star glyph, so `4.3` renders as `4.3`.
The gold row is `w-max` and each star `shrink-0` — the clip is narrower than five stars, and
a normal flex row compresses its glyphs into that box, which paints the grey star around
every gold one. The value is **clamped to 0–5**,
because it renders an average straight off the API and an out-of-range one would set a CSS
width above 100%, painting a sixth star's worth of gold past the end of the row. The star
colour is `--color-rating`, a token of its own — deliberately not `STATUS.warning`, which
is the same amber and means something else entirely (see `src/styles/CLAUDE.md`).

`StarIcon` in `ui/icons.tsx` is its glyph. It is drawn as a **fill**, unlike every
other icon there, which are strokes: the clip that produces a partial star would
otherwise cut through a visible outline mid-glyph.

**`layout/Pagination` is antd-free deliberately, not for want of an antd `Pagination`.**
It renders real anchors and takes a `buildHref(page)`, so every page of a list is a URL a
crawler can follow, the router can prefetch and a visitor can bookmark. antd's version is
`onChange`-driven and would pull the client runtime into a route whose point is
server-rendered HTML. Use it wherever a *public* list pages; a paged table inside an
already-client admin island is the case for antd's. Either kind is omitted when the list
is shorter than `PAGINATION_MIN_ITEMS` (10) — there is no second page to offer — and a
list whose own page is shorter than that (reviews are five) must still render every row
when it skips the pager.

**`ui/index.ts` re-exports only `./bare` and `./layout`, deliberately.** Re-exporting an
antd wrapper there would pull antd's runtime into the client bundle of any route that
merely wants an `AppTitle`. Import wrappers from their own path.

## Dialogs — never reach for antd `Modal` directly

Two wrappers own every dialog in the app. Pick by what the dialog is *for*:

| The dialog is | Use | Shape |
|---|---|---|
| A yes/no question — delete, discard, unpublish, cancel a booking | **`ui/AppConfirmModal`** | Centred 30rem modal on every viewport |
| A panel of content or a form the user works inside | **`ui/AppSheet`** | Modal ≥`md` (body capped at `80dvh` and scrollable), bottom Drawer below |

`AppSheet` takes `pending`. While it is true the close button stays visible but disabled, and mask click and Escape are locked, on both the modal and the bottom drawer — the same dismissal lock `AppConfirmModal` applies during `onConfirm`. The caller disables the actions inside the sheet; `pending` only owns the chrome. Explore's filter sheet and the week-schedule editor do not pass it, because nothing in them is in flight.

`AppConfirmModal` takes **every** `ModalProps` and forwards it, minus the three it owns —
`onOk` (it is `onConfirm`, which may be async), `footer` (the Confirm/Cancel pair *is* the
component) and `title` (narrowed to required). What it adds on top of a bare `Modal`:

- a tone badge — `tone='danger'` reddens the glyph and the confirm button;
- `description` rendered through `AppParagraph`, the title through `AppTitle level='h2'`,
  so a dialog is on the same type scale as the page behind it;
- **an awaited `onConfirm`**: the ok button goes busy and *every* dismissal route —
  close button, mask, Esc, Cancel — is locked until the promise settles, so a slow request
  cannot be abandoned into "did that delete happen or not?";
- a rejection caught, surfaced through `useErrorToast` (friendly copy, dev details — see
  *Errors* below), and the dialog left **open**. So a call site's `onConfirm` is
  deliberately written without its own try/catch — see `ProviderServices.tsx`. A call site
  with copy of its own throws a `UserFacingError`, which the toast shows verbatim.
- `Common.confirm` / `Common.cancel` / `Common.close` defaults, so a dialog is translated
  in all 15 locales without the call site passing `okText`.

A call site that hand-rolls a `Modal` loses all six, which is what the two delete dialogs
in this repo used to do — one of them titled `"Modal"`, both dismissible mid-request.
Gate — `<Modal` belongs to the two wrappers and nowhere else:

Enforced by `pnpm gates` (`scripts/gates.mjs`) — `<Modal` belongs to the two wrappers
and nowhere else.

## Errors — one pipeline, two audiences

A failure is written for two readers. **Production shows friendly, translated copy**, chosen
by what *kind* of failure it was (`Errors.kinds.*`) or by a stable code (`Errors.codes.*` —
the `AUTH_ERROR_CODES`, slot taken), with Retry where retrying can help and Reload where
a deploy changed the page's code. **Development shows the same copy plus the original
error** — server message, `status · METHOD path · code`, stack — collapsed under
*Developer details*. The server's own `message` is English and often written for
developers (`providerId, serviceId, and startAt required`), so it never reaches a
production reader.

Every surface below goes through `classifyError` (`src/helpers/error.ts`) and
`useErrorMessage` (`src/hooks/`), which is what makes that split hold everywhere at once.
`SHOW_ERROR_DETAILS` (`src/constants/errors.ts`) is `NODE_ENV !== 'production'`, so
`next start` of a production build hides the details exactly as the deployed site does.

| The failure | Use | Notes |
|---|---|---|
| A route segment's render or fetch threw | `error.tsx` → **`errors/RouteErrorFallback`** | Wires Next's **`retry`** (re-fetches), never `reset` (re-renders only). Pass `inline` inside a settings shell. See `src/app/CLAUDE.md`. |
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
  thrown `UserFacingError`; both beat the generic kind copy and stay translated.
- **`ErrorAlert` is the only inline error block.** No antd `Alert type='error'`, no
  `role='alert'` div.

Enforced by `pnpm gates`: no hand-rolled error blocks, no rendered
`processError(…).message`, and no `.catch(() => undefined)` — a deliberate silence goes
through `reportError`.

## antd props go stale — read the type before you use one

antd 6.6.1 marks **199 props across 62 components** `@deprecated`. TypeScript does not
error on a deprecated prop and `pnpm typecheck` stays green — the only signal is the
strikethrough in the editor. So one lands silently, works today, and breaks on the next
major.

**Never write an antd prop from memory or from a v4/v5 example.** Ctrl+click the prop, or
read `node_modules/antd/es/<component>/index.d.ts`, and use whatever that type says
*today*. The component you remember is not the component installed here.

The direction v6 keeps moving in is **one object prop absorbing a flat family**:

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

That table is a snapshot, not the source of truth —
`grep -rn "@deprecated" node_modules/antd/es/*/*.d.ts` is. Re-read it after any antd bump.

Enforced by `pnpm gates` — the prop list lives in `scripts/gates.mjs`. Add a name there
when a new deprecation lands, not to a grep in a doc.

It deliberately omits `Space direction=` and `Divider type=` — those names are legitimate
on our own components (`NavLinks orientation`, `ConfigProvider direction`, every `type=`),
so a grep there would only cry wolf. They stay a read-the-type check.

## Exports

Nothing here is a framework entry point, so the export style is always a free choice — and
the repo preference applies without exception in this directory. Every component is a
**named export declared inline** — `export const AppButton: FC<…> =` — and the barrels
forward it by that name:

```ts
export { AppLink, type AppLinkTone } from './AppLink' // not `default as AppLink`
```

So `import { AppButton } from '@components/ui/AppButton'` and
`import { AppTitle } from '@components/ui/bare'` are the same symbol under the same name
at every call site. A default export would let each importer rename it silently, which is
what made `ProviderProfileFormImage.tsx` export a component called
`ProviderProfileImage`. Gates — both currently hold, keep them at zero:

Both are enforced by `pnpm gates`.

## A wrapper has to forward its ref

`AppButton` declares `ref` explicitly, because antd's `ButtonProps` does not carry one —
the real `Button` is a `ForwardRefExoticComponent`, so its ref lives outside the props
type. In React 19 a ref is an ordinary prop and spreading it through is enough, but
without the declaration the wrapper cannot be *typed* as a `Dropdown` / `Tooltip` /
`Popover` trigger — those clone the child and need a handle on its DOM node to position
the popup. That is why `ProviderServiceCard` reaches past `AppButton` to a raw `Button`
for its trigger; new code does not have to.

Any new antd wrapper that could plausibly be a popup trigger needs the same two lines.

## Styling

Always route `className` through `cn` (`src/helpers/cn.ts` = `twMerge(clsx(...))`).
Plain concatenation is not enough: class order in the `class` attribute has no effect on
precedence — the generated stylesheet's order decides. A primitive that hardcodes a
default (`bg-transparent`) cannot be overridden by its caller unless the losing class is
actually *removed*, which is what `twMerge` does.

Responsive variants are a **last resort** — 36 usages exist, 27 of them `md:`, and almost
all are a direction or visibility switch rather than a size table. Prefer fluidity:
`clamp()` type, `app-gutter-x`, `auto-fill/minmax` grids, `dvh`. The JS counterpart is
`Grid.useBreakpoint()`, used in exactly one place (`AppSheet`).

Spacing between form fields is owned by the parent flex `gap` — `theme.ts` sets
`Form.itemMarginBottom: 0`. Do not reintroduce `mb-*!` classes.

**Do not pass `size='large'`** on antd controls, wrappers, or `Spin`. antd's default
is the app size. The six remaining call sites are deliberate and listed in
`src/styles/CLAUDE.md` invariant 10; do not copy them onto a neighbouring control.
Enforced by `pnpm gates`.

## Forms

Ant Design `Form` is the single source of truth for form state **and** validation. See
the `forms` skill. Formik was removed on 2026-09-11 and must not be reintroduced — the
two stores fight, antd wins the render while Formik wins the submit, and that split is
where every form bug this repo has had came from.

## Client/server boundary

- Add `"use client"` only for hooks, store access, browser APIs, or interactivity.
- `src/app/global-error.tsx` renders **outside** `ConfigProvider` and therefore cannot
  use antd at all — it uses inline styles fed from `tokens.ts`.
- There is exactly one `ConfigProvider`, in `src/components/App.tsx`. Do not nest another.
  It takes `locale` and `direction` alongside `theme`; both are resolved on the server and
  passed down as props, because `App.tsx` is a client component and the locale is not in
  the URL. `App.tsx` is also where `setDayjsLocale` is called — client-side only, since
  dayjs's locale is a module global. See `src/i18n/CLAUDE.md`.

## Known non-canonical code — do not copy

- **Client islands still importing `ui/icons.tsx`.** The table above says
  `@ant-design/icons` on a `'use client'` file, and `ReviewCardActions` now does that.
  Most other client islands still pull `MailIcon` / `LockIcon` / `CopyIcon` / … from
  `ui/icons.tsx` so the stroke matches the server set. That is leftover matching, not
  a reason to add another glyph. A new icon on a client island is an antd import.

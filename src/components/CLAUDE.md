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
| An icon on the server → `ui/icons.tsx` | An icon in a client island → `@ant-design/icons` |

## The three tiers

```
ui/bare/      antd-free BY CONTRACT — server-renderable. Never import antd here.
ui/layout/    antd-free page structure. Same contract.
ui/           antd wrappers — client islands (AppButton, AppInput, AppTextArea, AppFormItem,
              AppSheet, AppConfirmModal, ErrorState)
```

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

**`layout/Pagination` is antd-free deliberately, not for want of an antd `Pagination`.**
It renders real anchors and takes a `buildHref(page)`, so every page of a list is a URL a
crawler can follow, the router can prefetch and a visitor can bookmark. antd's version is
`onChange`-driven and would pull the client runtime into a route whose point is
server-rendered HTML. Use it wherever a *public* list pages; a paged table inside an
already-client admin island is the case for antd's.

**`ui/index.ts` re-exports only `./bare` and `./layout`, deliberately.** Re-exporting an
antd wrapper there would pull antd's runtime into the client bundle of any route that
merely wants an `AppTitle`. Import wrappers from their own path.

## Dialogs — never reach for antd `Modal` directly

Two wrappers own every dialog in the app. Pick by what the dialog is *for*:

| The dialog is | Use | Shape |
|---|---|---|
| A yes/no question — delete, discard, unpublish, cancel a booking | **`ui/AppConfirmModal`** | Centred 30rem modal on every viewport |
| A panel of content or a form the user works inside | **`ui/AppSheet`** | Modal ≥`md`, bottom Drawer below |

`AppConfirmModal` takes **every** `ModalProps` and forwards it, minus the three it owns —
`onOk` (it is `onConfirm`, which may be async), `footer` (the Confirm/Cancel pair *is* the
component) and `title` (narrowed to required). What it adds on top of a bare `Modal`:

- a tone badge — `tone='danger'` reddens the glyph and the confirm button;
- `description` rendered through `AppParagraph`, the title through `AppTitle level='h2'`,
  so a dialog is on the same type scale as the page behind it;
- **an awaited `onConfirm`**: the ok button goes busy and *every* dismissal route —
  close button, mask, Esc, Cancel — is locked until the promise settles, so a slow request
  cannot be abandoned into "did that delete happen or not?";
- a rejection caught, surfaced with `processError` + `message.error`, and the dialog left
  **open**. So a call site's `onConfirm` is deliberately written without its own try/catch —
  see `ProviderServices.tsx`.
- `Common.confirm` / `Common.cancel` / `Common.close` defaults, so a dialog is translated
  in all 15 locales without the call site passing `okText`.

A call site that hand-rolls a `Modal` loses all six, which is what the two delete dialogs
in this repo used to do — one of them titled `"Modal"`, both dismissible mid-request.
Gate — `<Modal` belongs to the two wrappers and nowhere else:

```bash
grep -rn "<Modal" src --include=*.tsx | grep -v "src/components/ui/App"   # 0
```

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

Gate — keep at zero:

```bash
grep -rnE "\b(bordered|showArrow|dropdown(ClassName|Style|Render|MatchSelectWidth)|onDropdownVisibleChange|popupClassName|dataSource|autoClearSearchValue|optionFilterProp|filterSort|filterOption|searchValue|onSearch|bodyStyle|headStyle|onAfterChange|orientationMargin|destroyOnClose|maskClosable|wrapperClassName)=|\b(Select|AutoComplete|TreeSelect|Cascader)\.(Option|OptGroup)\b|\bStatistic\.Countdown\b|antd/es/statistic/Countdown" src --include=*.ts --include=*.tsx   # 0
```

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

```bash
grep -rn  "export default"  src/components --include=*.ts --include=*.tsx   # 0
grep -rn  "default as"       src/components --include=*.ts                  # 0
```

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

## Forms

Ant Design `Form` is the single source of truth for form state **and** validation. See
the `forms` skill. Formik must not be reintroduced — the two stores fight, and antd wins
the render while Formik wins the submit, which is where the current form bugs come from.

## Client/server boundary

- Add `"use client"` only for hooks, store access, browser APIs, or interactivity.
- `src/app/global-error.tsx` renders **outside** `ConfigProvider` and therefore cannot
  use antd at all — it uses inline styles fed from `tokens.ts`.
- There is exactly one `ConfigProvider`, in `src/components/App.tsx`. Do not nest another.
  It takes `locale` and `direction` alongside `theme`; both are resolved on the server and
  passed down as props, because `App.tsx` is a client component and the locale is not in
  the URL. `App.tsx` is also where `setDayjsLocale` is called — client-side only, since
  dayjs's locale is a module global. See `src/i18n/CLAUDE.md`.

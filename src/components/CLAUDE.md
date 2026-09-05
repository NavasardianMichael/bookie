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
| Page structure — Container / PageShell / Section / PageHeader / ResponsiveGrid / Surface / ChipRail / SettingsShell | antd already supplies focus trap / scroll lock / a11y |
| An icon on the server → `ui/icons.tsx` | An icon in a client island → `@ant-design/icons` |

## The three tiers

```
ui/bare/      antd-free BY CONTRACT — server-renderable. Never import antd here.
ui/layout/    antd-free page structure. Same contract.
ui/           antd wrappers — client islands (AppButton, AppInput, AppFormItem, AppSheet, ErrorState)
```

**`ui/index.ts` re-exports only `./bare` and `./layout`, deliberately.** Re-exporting an
antd wrapper there would pull antd's runtime into the client bundle of any route that
merely wants an `AppTitle`. Import wrappers from their own path.

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

That table is a snapshot, not the source of truth —
`grep -rn "@deprecated" node_modules/antd/es/*/*.d.ts` is. Re-read it after any antd bump.

Gate — keep at zero:

```bash
grep -rnE "\b(bordered|showArrow|dropdown(ClassName|Style|Render|MatchSelectWidth)|onDropdownVisibleChange|popupClassName|dataSource|autoClearSearchValue|optionFilterProp|filterSort|filterOption|searchValue|onSearch|bodyStyle|headStyle|onAfterChange|orientationMargin|destroyOnClose|maskClosable|wrapperClassName)=|\b(Select|AutoComplete|TreeSelect|Cascader)\.(Option|OptGroup)\b" src --include=*.ts --include=*.tsx   # 0
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

## Styling

Always route `className` through `cn` (`src/helpers/cn.ts` = `twMerge(clsx(...))`).
Plain concatenation is not enough: class order in the `class` attribute has no effect on
precedence — the generated stylesheet's order decides. A primitive that hardcodes a
default (`bg-transparent`) cannot be overridden by its caller unless the losing class is
actually *removed*, which is what `twMerge` does.

Responsive variants are a **last resort** — 36 usages exist, 27 of them `md:`, and almost
all are a direction or visibility switch rather than a size table. Prefer fluidity:
`clamp()` type, `app-gutter-x`, `auto-fill/minmax` grids, `dvh`. The JS counterpart is
`Grid.useBreakpoint()`, used in exactly two places (`AppSheet`, `Calendar`).

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

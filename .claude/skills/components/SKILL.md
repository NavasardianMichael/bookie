---
name: components
description: Quick checklist for writing or editing a component in this repo. Use as a fast pre-write/pre-commit pass alongside the design-system and forms skills, which cover the full how-to and rationale.
---

# Components

Two lists. `design-system` skill has the *how*; `src/components/CLAUDE.md` has the
*why*. This is the checklist.

**Maintenance:** whenever the user states component guidance in chat — in any future
session — propose adding it here, but **ask for confirmation in the chat first**
(e.g. "add this to the components skill's Best practices?") and wait for a yes/no
before editing the file. Never append silently. A positive statement ("do X",
"prefer X") becomes a new bullet under *Best practices*; a negative one ("don't do
X", "never do Y", "avoid X") becomes a new bullet under *Avoid patterns*. Keep new
bullets terse, matching the existing style — no restating rationale beyond what the
user's own phrasing carries. Only propose this for guidance about writing/editing
components in this repo. If a new point duplicates or contradicts an existing
bullet, propose editing that bullet in place instead of adding a near-duplicate.

## Best practices

- Check `src/components/CLAUDE.md`'s inventory and `src/helpers/CLAUDE.md` before
  writing anything new — reuse beats creating.
- Content and structure (headings, text, links, page layout) → `ui/bare/` or
  `ui/layout/`. Interaction (Button, Input, Form, Select) → antd. The rule is
  `"use client"` and crawler-visible HTML, not aesthetics.
- Dialogs are the exception to that: a yes/no question → `ui/AppConfirmModal`, a panel
  or a form the user works inside → `ui/AppSheet`. Both take the full `ModalProps`
  surface, so nothing is lost by going through them.
- Explicit typed `Props` on every component; explicit types on params and return
  values.
- **Prefer a named export declared inline** — `export const AppButton = …` over
  `export default AppButton` or a trailing `export { AppButton }`. This is a preference,
  not a hard requirement: where a framework or tool resolves a module *by* its default
  binding, that default is the contract and you leave it alone — a Next.js route module
  (`page`, `layout`, `loading`, `error`, `not-found`, `icon`, `manifest`, …), a config
  file (`next.config.ts`, `postcss.config.mjs`, a Vite config), an ambient `.d.ts`
  declaring a third-party module. Everywhere the choice is genuinely free, go named.
- A thin antd wrapper must spread `...props` onto the real control so antd's injected
  props (e.g. `value`/`onChange` from `Form.Item`) reach it.
- Before writing any antd prop, read its **current** type — Ctrl+click it, or open
  `node_modules/antd/es/<component>/index.d.ts`. antd 6.6.1 marks 199 props across 62
  components `@deprecated` and `typecheck` stays green on every one of them.
- v6 keeps folding flat prop families into one object: search config onto
  `showSearch={{ onSearch, filterOption, optionFilterProp, … }}`, `dropdown*` onto
  `classNames.popup.root` / `styles.popup.root` / `popupRender` / `popupMatchSelectWidth`,
  inline styles onto `styles.*`, `bordered` onto `variant`. The full mapping and its grep
  gate are in `src/components/CLAUDE.md`.
- Route every `className` through `cn` (`twMerge(clsx(...))`) — plain concatenation
  can't remove a losing class, only `twMerge` can.
- Import a wrapper (`AppButton`, `AppInput`, `AppTextArea`, `AppFormItem`, `AppSheet`,
  `AppConfirmModal`, `ErrorState`) from its own path, never through `ui/index.ts` — that
  barrel re-exports `bare` and `layout` only.
- A clickable card uses a stretched `<Link>` overlay, not an anchor wrapped around
  interactive children.
- Keep files small and single-purpose; split rather than append.
- Comment only the non-obvious why — a hidden constraint or a workaround — never what
  the code already says through naming.

## Avoid patterns

- Don't use a custom field component as the direct child of a named `Form.Item`
  without implementing the `value`/`onChange` control contract — antd's props land
  nowhere and that field silently never submits.
- Don't wrap the real control in a layout element (`Flex`, a `div`) inside
  `Form.Item` — antd clones the wrapper, not the control, and `value`/`onChange`
  land on the wrong node.
- Don't copy an antd prop from memory or from a v4/v5 snippet — `bordered`, `showArrow`,
  `dropdownClassName`, `dropdownStyle`, `dropdownRender`, `onDropdownVisibleChange`,
  `dropdownMatchSelectWidth`, `dataSource`, `<Option>` children, `bodyStyle`/`headStyle`,
  `destroyOnClose`, `maskClosable`, `onAfterChange` and the bare search props are all
  deprecated in the installed version and none of them fail typecheck.
- Don't pass `showSearch` alongside `onSearch` / `filterOption` / `optionFilterProp` —
  the flat props are deprecated and the object form already implies the flag:
  `showSearch={{ optionFilterProp: 'label' }}`.
- Don't reintroduce Formik on any form field — it fights antd's store and loses the
  submit even when it wins the render.
- Don't hand-roll an antd `Modal` for a yes/no confirmation — use `ui/AppConfirmModal`.
  A hand-rolled one loses the danger tone, the awaited `onConfirm` that locks every
  dismissal route while the request is in flight, the caught rejection that keeps the
  dialog open, and the translated Confirm/Cancel/Close defaults. Gate:
  enforced by `pnpm gates`.
- Don't write a call-site `try`/`catch` inside an `AppConfirmModal` `onConfirm` — the
  modal already catches, reports via `processError`, and stays open on failure.
- Don't re-export an antd wrapper from `ui/index.ts` — it pulls antd's client
  runtime into every route that imports anything from that barrel.
- Don't hardcode a hex value or a magic px dimension outside `src/styles/tokens.ts`.
- Don't add a Tailwind `!important` suffix — antd's unlayered cssinjs still wins;
  move the value into an antd token instead.
- Don't nest a button or link inside an `<a>` — invalid HTML that breaks keyboard
  navigation; use a stretched link over inert content instead.
- Don't import `@ant-design/icons` in a Server Component — it's client-only and
  fails at build time; use `ui/icons.tsx` for server-safe icons.
- Don't reach for a responsive breakpoint variant first — prefer `clamp()` type,
  `app-gutter-x`, and `auto-fill`/`minmax` grids before adding a `md:`-style class.
- Don't use `any` without an explicit justification comment, and don't mix UI, API,
  and store concerns inside one component.

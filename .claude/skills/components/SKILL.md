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
  `ui/layout/`. Interaction (Button, Input, Form, Modal, Select) → antd. The rule is
  `"use client"` and crawler-visible HTML, not aesthetics.
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
- Route every `className` through `cn` (`twMerge(clsx(...))`) — plain concatenation
  can't remove a losing class, only `twMerge` can.
- Import a wrapper (`AppButton`, `AppInput`, `AppFormItem`, `AppSheet`, `ErrorState`)
  from its own path, never through `ui/index.ts` — that barrel re-exports `bare` and
  `layout` only.
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
- Don't reintroduce Formik on any form field — it fights antd's store and loses the
  submit even when it wins the render.
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

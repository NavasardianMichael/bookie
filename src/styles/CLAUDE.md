# Design tokens — invariants

**A raw hex or a magic control dimension may appear in `tokens.ts` only.** Everything
else derives from it. The `design-system` skill covers *how to build UI*; this file is
the list of things that must not break. (The numbers below are cited by
`scripts/gates.mjs` — keep them stable.)

## One owner per value

```
tokens.ts ─→ theme.ts ─→ ConfigProvider(cssVar) ─→ :root{--ant-*}
                                                        │
          globals.css §2 alias block ───────────────────┘   (the ONLY place
                │                                            allowed to name --ant-*)
                └─→ @theme inline ─→ Tailwind utilities (bg-brand, text-brand-muted…)

Breakpoints: antd v6 defaults, NEVER overridden  ←→  globals.css @theme literals
```

`globals.css` is 8 numbered sections. Respect the numbering when editing.

## The invariants

1. Hex and magic px: `tokens.ts` only. The one declared exception is the brand-ramp and
   `RATING` mirror in `globals.css` §4, which says so in a comment. **`RATING` is not
   `STATUS.warning`**, though both are amber — a rating is not a caution. Filled stars are
   the brand navy; the antd `Rate` sets `starColor` / `starBg` as component tokens, not
   classes.
2. `globals.css` §2 is the only place that may name an `--ant-*` variable, so an antd
   upgrade or prefix change stays a one-file edit.
3. **Never override antd's `screen*` tokens.** Overriding one forces all 21, and
   `validateBreakpoints()` throws at runtime if the Min/Max chain is inconsistent.
4. `--breakpoint-*: initial` resets Tailwind's own scale, so `2xl:` cannot silently mean
   1536px. Zero `2xl:`/`3xl:` usages.
5. `<BreakpointInvariant/>` asserts tokens.ts ↔ globals.css ↔ antd agree, in dev only.
6. No dark mode, ever. `color-scheme: light`, zero `dark:` classes.
7. The app font variable is `--font-app`, never `--font-sans` (trap 2). The face is Manrope
   (`src/styles/fonts.ts`). Everything reads the composed `--font-stack`, which appends
   `--font-script` — the per-locale face for the six scripts Manrope lacks — *after* Manrope,
   so Latin text inside an Arabic or CJK UI stays Manrope. `--font-script` is read through a
   `var()` fallback, never given a `:root` default. Only the active locale's class goes on
   `<html>`; script faces are `preload: false`. next/font arguments must be written literals
   (do not DRY `fonts.ts`), and `subsets` only decides preloading, not what is served.
8. Body copy is charcoal (`NEUTRAL[900]`); navy (`BRAND[900]`) is the accent, not the text
   colour. Copy *on* navy uses `tone='inverse'` — never `text-brand-muted` or `text-white/N`.
   The canvas is `colorBgLayout` / `--brand-surface-sunken`; white is reserved for `Surface`
   panels and the sticky header.
9. `--spacing-header` is `4rem`. `h-header` and the `PageShell variant='fill'` calc read it.
10. **Control height is antd's own unmodified default.** `theme.ts` sets no global
    `controlHeight*`; do not reintroduce a global height scale (a `CONTROL` token was tried
    and produced a 40/48px mix).

    **Do not pass `size='large'`.** The remaining call sites are the complete allowlist,
    mirrored in `scripts/gates.mjs`:

    | File | Why it stayed |
    |---|---|
    | `ProviderSearchField.tsx` | Explore's search box and its Search button, which must match |
    | `BookingSlots.tsx` | the Book now CTA |
    | `AuthCallbackClient.tsx`, `VerifyEmailClient.tsx`, `useGoogleSignUp.tsx` | full-page `Spin` on the auth waiting screens |

    A new `size='large'` is a design exception: add it to this table and the gate in the
    same change.

    **Select and Button match Input height on their own component tokens** (`controlHeight`
    on `components.Select` / `components.Button`, derived from the shared `FIELD_PADDING_*`
    constants in `theme.ts`). Change those constants, never a call-site height. `AppLink`'s
    `button` variant is an anchor: its `h-9` mirrors the Button by hand, and `theme.spec.ts`
    fails if they drift.
11. **Radius is the one sizing token that *is* overridden** — `RADII.base`/`RADII.lg` (8/12)
    via `borderRadius`/`borderRadiusLG`, feeding `rounded-brand-sm`/`rounded-brand` too.
    Change them here, never at a call site.
12. **`CSS_VAR_SCOPE` must stay on `<html>`.** antd scopes its `--ant-*` block to
    `theme.cssVar.key`; without that class on `<html>` the block never lands on `:root`, and
    every `bg-brand`, `rounded-brand` and `border-brand-border` resolves to nothing. Pinned
    by `tests/unit/styles/theme.spec.ts`.

### Why breakpoints are the one accepted duplication

antd never emits its `screen*` tokens as CSS variables (they are fed to `matchMedia()` as JS
numbers), and media queries cannot resolve `var()`. So: adopt antd's scale, override zero
`screen*` tokens, declare the numbers once as Tailwind literals, and assert the mirror at
runtime. The literals are **px, not rem** — media-query `rem` follows the browser's default
font size while `matchMedia` strings are px.

## Traps — read before touching this code

1. **A `!` suffix cannot be fixed by import order or `@layer`.** antd's cssinjs `<style>`
   blocks are **unlayered**, and unlayered beats Tailwind's `@layer utilities`. The durable
   fix is an antd token (as `Form.itemMarginBottom: 0` does). `!`-suffix count is 0; keep it
   there. Our muted `p`/`li`/`dd` rule is the exception that *does* belong in `@layer base`.
2. **`--font-sans` collides with Tailwind v4's own default theme variable** — `:root` and
   next/font's class have identical specificity. The app font is `--font-app`; `globals.css`
   maps `--font-sans` onto it.
3. **`@ant-design/icons` is client-only** (`createContext`). A Server Component importing it
   fails at **build** time. Server-safe SVGs live in `src/components/ui/icons.tsx`; client
   islands import from `@ant-design/icons` — see `src/components/CLAUDE.md`.
4. **antd seed colours must be literal hex.** `colorPrimary` feeds antd's palette generator;
   a `var()` string produces garbage swatches.
5. **Tailwind v4 tree-shakes unused `@theme` variables.** `BreakpointInvariant` treats `NaN`
   as "not used yet", not a mismatch.
6. **Container width classes must be static strings in a lookup object**, never template
   interpolation — Tailwind scans source text.
7. `@theme` edits sometimes need a turbopack restart.
8. **Write the canonical class name, never a legacy alias** — they still compile, so they
   only show up as IDE diagnostics: `break-words` → `wrap-break-word`, `overflow-ellipsis` →
   `text-ellipsis`, `order-none` → `order-0`, bare `start-*`/`end-*` →
   `inset-s-*`/`inset-e-*`, `flex-shrink-*`/`flex-grow-*` → `shrink-*`/`grow-*`,
   `*-opacity-N` → the `/N` modifier. Gated.
9. **A component's tokens are not always the ones its markup reads.** `Dropdown` styles its
   items off the **global** `controlItemBg*` aliases, never `Menu`'s tokens, so a
   `components.Menu` block aimed at a dropdown is dead config that typechecks. Our navy makes
   antd's derived `controlItemBgActive` land on mid-grey, so `components.Dropdown` pins the
   three aliases to the brand ramp (selected fill `BRAND[100]`, since the text is
   `colorPrimary`). **Read the component's own `style/index.js` before picking a token.**

## Grep gates

`pnpm gates` (inside `pnpm verify`) runs **`scripts/gates.mjs`**, the source of truth — add a
new gate there, not as prose here. Each gate is scoped by file extension (unscoped, every
pattern would match the docs describing it). Current gates in this layer: no `dark:`, no
`combineClassNames` (use `cn()`), no `bookie-blue`/`bookie-gray`, no `!` suffixes, no
`2xl:`/`3xl:`, no `h-[NNpx]`, no hex outside `src/styles/`, no legacy Tailwind aliases
(trap 8), no new `size='large'` (invariant 10).

## Known leak sites

A few antd `style={{…}}` / `styles={{ slot }}` call sites (two CSS Modules) still hardcode px —
prefer a token or a Tailwind class via `classNames`. `opengraph-image.tsx` and `icon.tsx` are
legitimate exceptions: satori cannot resolve CSS variables, so they import `tokens.ts`.

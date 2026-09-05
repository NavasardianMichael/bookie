# Design tokens — invariants

**A raw hex or a magic control dimension may appear in `tokens.ts` only.** Everything
else derives from it. The `design-system` skill covers *how to build UI*; this file is
the list of things that must not break.

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

1. Hex and magic px: `tokens.ts` only. The brand-ramp mirror in `globals.css` §4 is the
   one declared exception and says so in a comment.
2. `globals.css` §2 is the only place that may name an `--ant-*` variable. An antd
   upgrade or prefix change must stay a one-file edit.
3. **Never override antd's `screen*` tokens.** Overriding one forces all 21, and
   `validateBreakpoints()` throws at runtime if the Min/Max chain is inconsistent.
4. `--breakpoint-*: initial` resets Tailwind's own scale first, so `2xl:` cannot
   silently mean 1536px. There must be zero `2xl:`/`3xl:` usages.
5. `<BreakpointInvariant/>` asserts tokens.ts ↔ globals.css ↔ antd agree, in dev only.
6. No dark mode, ever. `color-scheme: light`, zero `dark:` classes.
7. The app font variable is `--font-app`, never `--font-sans`. The face is Manrope
   (`src/styles/fonts.ts`), matching `design/initial prototype`. Everything reads the
   composed `--font-stack`, which appends `--font-script` — the per-locale face for the
   six scripts Manrope has no glyphs for — *after* Manrope, so per-glyph fallback keeps
   Latin text in Manrope inside an Arabic or CJK UI. `--font-script` is read through a
   `var()` fallback and never given a `:root` default, for the reason in trap 2. See
   `src/i18n/CLAUDE.md`.
8. Body copy is charcoal (`NEUTRAL[900]`, `#121417`); navy (`BRAND[900]`) is the brand
   accent, not the text colour. The canvas is `colorBgLayout` / `--brand-surface-sunken`
   (`#f6f7f8`); white is reserved for `Surface` panels and the sticky header.
9. `--spacing-header` is `4rem` (the prototype's 64px bar). `h-header` and the
   `PageShell variant='fill'` calc both read it.
10. **Control height is antd's own unmodified default.** `theme.ts` sets no
    `controlHeight*`. A `CONTROL` token existed briefly and was removed: every call site
    had to remember `size='large'` to reach it, individual antd controls (`Segmented`,
    `Select`, `TimePicker`, …) drifted out of sync, and the app ended up with a mix of
    40px and 48px controls. Do not reintroduce a height scale without also removing
    every per-call-site `size='large'`.
11. **Radius is the one sizing token that *is* overridden** — `RADII.base`/`RADII.lg`
    (8/12) via `borderRadius`/`borderRadiusLG`. antd's own 6/8 reads visibly squarer
    than every prototype screen. Two static values, no scale, no breakpoints; they feed
    `rounded-brand-sm`/`rounded-brand`, so antd components and Tailwind surfaces move
    together. Change them here, never at a call site.
12. **`CSS_VAR_SCOPE` must stay on `<html>`.** antd scopes its emitted `--ant-*` block
    to `theme.cssVar.key`; `app/layout.tsx` puts that class on `<html>` so the block
    lands on `:root`, which is what globals.css §2 reads. Without it antd derives the
    key from `useId()` and the only elements carrying it are antd's own components — so
    every `bg-brand`, `rounded-brand` and `border-brand-border` in the app silently
    resolves to nothing (transparent fills, 0 radius, default borders). This shipped
    broken once; `tests/unit/styles/theme.spec.ts` now pins both ends.

### Why breakpoints are the one accepted duplication

Both directions are impossible, verified in `node_modules`:

- antd's `theme/useToken.js` lists all 21 `screen*` tokens in a `preserve` map, so
  cssinjs never emits them as CSS variables — `_util/responsiveObserver.js` feeds them
  to `window.matchMedia()` as JS numbers.
- Tailwind's `--breakpoint-*` compile into `@media (width >= X)`, and **media queries
  cannot resolve `var()`**.

So single-source is achieved by *deletion*: adopt antd's scale, override zero `screen*`
tokens, declare the numbers once as Tailwind literals, assert the mirror at runtime.
The literals are **px, not rem**, on purpose — media-query `rem` is relative to the
browser's default font size while `matchMedia` strings are px, so a user raising their
default font size would silently desync the two.

## Traps — read before touching this code

1. **The `!`-suffix debt cannot be fixed by import order or `@layer`.** `@import
   'tailwindcss'` puts utilities in `@layer utilities`; antd's runtime cssinjs `<style>`
   blocks are **unlayered**, and unlayered beats layered. The only durable fix is moving
   the value into an antd token — which is what `Form.itemMarginBottom: 0` does. Current
   `!`-suffix count is 0; keep it there.
2. **`--font-sans` collides with Tailwind v4's own default theme variable.** `:root` and
   next/font's generated class have identical specificity, so the winner would depend on
   stylesheet order. The app font is `--font-app`; `globals.css` maps `--font-sans` onto it.
3. **`@ant-design/icons` is client-only** (it uses `createContext`). A Server Component
   importing it fails at **build** time, not runtime. Server-safe inline SVGs live in
   `src/components/ui/icons.tsx`.
4. **antd seed colours must be literal hex.** `colorPrimary` is fed to antd's palette
   generator to derive Hover/Active/Bg variants; a `var()` string produces garbage swatches.
5. **Tailwind v4 tree-shakes unused `@theme` variables.** `--text-h1`, `--breakpoint-xxl`
   etc. only appear in the output once something uses them. `BreakpointInvariant` treats
   `NaN` as "not used yet", not a mismatch.
6. **Container width classes must be static strings in a lookup object**, never template
   interpolation — Tailwind v4 scans source text and will not generate an assembled class.
7. `@theme` edits sometimes need a turbopack restart. If a breakpoint seems ignored,
   restart before debugging.
8. **Write the canonical class name, never a legacy alias.** Tailwind still compiles the
   old spellings, so a stale one costs nothing at build time and shows up only as an IDE
   diagnostic — which is exactly why they accumulate. The alias table Tailwind 4.3 ships
   (`Ko` in `tailwindcss/dist/lib.js`) is the whole list: `break-words` →
   `wrap-break-word`, `overflow-ellipsis` → `text-ellipsis`, `order-none` → `order-0`,
   bare `start-*`/`end-*` → `inset-s-*`/`inset-e-*`. The v3 spellings Tailwind dropped
   outright count too: `flex-shrink-*`/`flex-grow-*` are `shrink-*`/`grow-*`, and
   `*-opacity-N` is the `/N` opacity modifier. `AppDescriptionList.tsx:46` was the last
   holdout; the gate below keeps it at zero.

## Grep gates

All of these return **0** today. Re-run after any change here.

Every gate is scoped to code file types. That is deliberate: without `--include`, each
pattern matches this very file and the gate can never pass. Some also match explanatory
comments in `theme.ts` / `tokens.ts` / `globals.css`, which is why the `!`-suffix and
`h-[NNpx]` gates are `.tsx`-only.

```bash
CODE="--include=*.ts --include=*.tsx --include=*.css"

grep -rn  "dark:" src $CODE                                    # 0, permanently
grep -rn  "combineClassNames" src $CODE                        # 0
grep -rn  "bookie-blue\|bookie-gray" src $CODE                 # 0
grep -rnoE "[a-z0-9)\]]!'" src --include=*.tsx                 # 0 — no `!` suffixes
grep -rnE "\b(2xl|3xl):[a-z]" src --include=*.tsx              # 0 — deleted breakpoints
grep -rnE "h-\[[0-9]+px\]" src --include=*.tsx                 # 0 — use control tokens
grep -rnE "#[0-9a-fA-F]{3,8}" src --include=*.ts --include=*.tsx | grep -v "src/styles/"   # 0
grep -rnE "(break-words|overflow-ellipsis|order-none|flex-(shrink|grow)-|(bg|text|border|divide|ring|placeholder)-opacity-)" src $CODE   # 0 — legacy class aliases
```

## Known leak sites

antd `style={{…}}` / `styles={{ slot }}` props are still design-system values, but a few
call sites hardcode px there: `BackHistoryBtn.tsx:28`, the byte-identical `Divider`/`Space`
pairs in `ProviderProfileFormCategories.tsx:44` and `ProviderProfileFormOrganization.tsx:44`,
plus two CSS Modules. Prefer a token or a Tailwind class via `classNames`.
`opengraph-image.tsx` and `icon.tsx` are legitimate exceptions — satori cannot resolve
CSS variables, so they import from `tokens.ts` directly.

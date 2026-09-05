---
name: design-system
description: Build pages and UI in this repo — which component to reach for (antd vs the antd-free bare/layout primitives), how the design tokens flow, and the invariants that must not break. Use when creating or editing any page, layout, or component, or when touching colours, spacing, breakpoints, or fonts. Triggers on "add a page", "style this", "make it responsive", "new component", "change the theme".
---

# Building UI

Token invariants and traps live in `src/styles/CLAUDE.md`; component boundaries in
`src/components/CLAUDE.md`. This skill is the *how*.

## Pick the component

The rule is **not aesthetic** — it is `"use client"` and what HTML a crawler sees. antd
v6 marks ~292 of its `es/` modules `"use client"`, so antd text only reaches the DOM
after hydration.

**Content and structure → the antd-free primitives.** Server-renderable by contract:

| | |
|---|---|
| `bare/AppTitle` | heading; `level` (outline) and `size` (visual) are **separate props** |
| `bare/AppText` | inline text — `as`, `size`, `tone`, `numeric` |
| `bare/AppParagraph` | `<p>`, defaults to `tone='muted'` |
| `bare/AppLink` | the one anchor primitive; `variant='inline'\|'plain'\|'button'\|'chip'` |
| `bare/AppTime` | `<time datetime>` + tabular numerals |
| `bare/AppDescriptionList` | real `<dl>`; replaces antd `Descriptions` |
| `bare/JsonLd` | the only sanctioned `dangerouslySetInnerHTML` |
| `layout/PageShell` | per-page wrapper — `variant='flow'\|'fill'`, `width` |
| `layout/Container` | width cap + fluid safe-area gutters |
| `layout/Section` | titled section with count / description / actions |
| `layout/PageHeader` | H1 + subtitle + meta + actions + media |
| `layout/ResponsiveGrid` | self-tuning `auto-fill` grid — **no breakpoints** |
| `layout/Surface` | white panel on the sunken canvas (border, radius, shadow) |
| `layout/ChipRail` | horizontal overflow chip scroller |
| `brand/BrandLockup` | navy mark tile + wordmark, shared by header and footer |
| `layout/Footer` (`components/layout/Footer.tsx`) | site footer, mounted once from `App.tsx` |
| `ui/EntityCard` | the one card for providers, orgs, categories, services |
| `ui/EmptyState`, `ui/ContactActions`, `ui/AppAvatar`, `ui/icons` | server-safe |

**Interaction → antd.** Button, Input, Form, Select, Modal, Drawer, Upload, TimePicker,
Segmented, AutoComplete, Tag, Flex, Divider, Space. It already gives you focus trap,
scroll lock and a11y; don't rebuild those.

**Thin antd wrappers** (client islands): `ui/AppButton`, `ui/AppInput`, `ui/AppFormItem`,
`ui/AppSheet`, `ui/ErrorState`.

Import wrappers from their own path. **`ui/index.ts` re-exports only `bare` and
`layout`** — re-exporting a wrapper there pulls antd's runtime into any route that
merely wants an `AppTitle`.

## A new page

```tsx
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Widgets',
  description: '…',
  alternates: { canonical: ROUTES[ROUTE_KEYS.widgets] },
}

const Widgets = async () => {
  const { allIds, byId } = await getWidgetsListAPI()
  const widgets = allIds.map((id) => byId[id!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getWidgetsListLDSchema(widgets)} />
      <PageHeader title='Widgets' subtitle={allIds.length ? `${allIds.length} listed` : undefined} />
      {widgets.length ? (
        <ResponsiveGrid as='ul'>{/* EntityCard per item */}</ResponsiveGrid>
      ) : (
        <EmptyState title='Nothing here yet' description='…' />
      )}
    </PageShell>
  )
}
```

Add a sibling `loading.tsx` using `CardGridSkeleton` — it renders through the *same*
`ResponsiveGrid` and aspect box as the real cards, so the handoff costs no CLS. Note
`CardGridSkeleton` is a **named** export and is in no barrel; import it by path.

`<main>` deliberately carries no container — each page picks its own width via
`PageShell`, so an auth form stays narrow while a card grid goes wide.

## Responsive

Responsive variants are a **last resort** — 36 exist, 27 of them `md:`, and nearly all
switch direction or visibility rather than sizing a table. Reach first for:

- `clamp()` type — the 8 semantic steps in `globals.css` §6 (`text-display` … `text-overline`)
- `app-gutter-x` — fluid safe-area padding, no per-breakpoint rules
- `ResponsiveGrid` — `repeat(auto-fill, minmax(min(17rem,100%),1fr))`. The inner
  `min(…, 100%)` is load-bearing: a bare `minmax(17rem,1fr)` overflows any container
  narrower than 17rem, and 320px minus gutters is 288px.
- `dvh` for full-height, via `PageShell variant='fill'`

For a genuine JS branch use `Grid.useBreakpoint()` — currently only in `AppSheet`
(Modal ≥md, Drawer below) and `Calendar` (slot duration).

## Styling

Always route `className` through `cn` (`twMerge(clsx(...))`). Plain concatenation is not
enough: class order in the attribute has no effect on precedence — the stylesheet's
order decides. A primitive hardcoding `bg-transparent` can't be overridden by its caller
unless the losing class is actually *removed*, which is what `twMerge` does.

Available token utilities: `bg-brand`, `bg-brand-{50…950}`, `text-brand`,
`text-brand-muted`, `border-brand-border`, `bg-surface`, `bg-surface-sunken`,
`rounded-brand`, `rounded-brand-sm`, plus `tnum`, `app-gutter-x`, `app-safe-t`,
`app-safe-b`, `h-header`.

**Never** write a hex outside `src/styles/tokens.ts`. Never add a `!` suffix — it can't
win against antd's unlayered cssinjs anyway; move the value into an antd token instead.
Use the **canonical** class name, not a legacy alias — Tailwind still compiles
`break-words`, `overflow-ellipsis` and `order-none`, but they mean `wrap-break-word`,
`text-ellipsis` and `order-0`. See `src/styles/CLAUDE.md` trap 8 for the full list.

## Before you're done

```bash
CODE="--include=*.ts --include=*.tsx --include=*.css"

grep -rn  "dark:" src $CODE                                    # 0
grep -rnoE "[a-z0-9)\]]!'" src --include=*.tsx                 # 0
grep -rnE "\b(2xl|3xl):[a-z]" src --include=*.tsx              # 0
grep -rnE "h-\[[0-9]+px\]" src --include=*.tsx                 # 0
grep -rnE "#[0-9a-fA-F]{3,8}" src --include=*.ts --include=*.tsx | grep -v "src/styles/"   # 0
grep -rnE "(break-words|overflow-ellipsis|order-none|flex-(shrink|grow)-|(bg|text|border|divide|ring|placeholder)-opacity-)" src $CODE   # 0

pnpm typecheck && pnpm lint && pnpm test
```

All six return 0 today. The `--include` scoping is required — without it each pattern
matches the docs that describe it, and the gate can never pass. `BreakpointInvariant`
should stay silent in the dev console.

The full gate list, with the reasoning behind each, is in `src/styles/CLAUDE.md`.

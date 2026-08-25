---
description: Scaffold a new App Router route with PageShell, metadata, JSON-LD, and a loading boundary.
argument-hint: <route-name> [list|detail]
---

# New route

Scaffold `src/app/$1/` following this repo's conventions. If the second argument is
omitted, infer `list` vs `detail` from the name and say which you chose.

Read the `design-system` skill for component choices before writing the page.

## Ask first, if unclear

- Does this route back onto an existing API domain, or does it need a new one? If new,
  use the `new-domain` skill for the API layer **before** writing the page.
- List route, detail route (`[id]`), or a static content page?

## What to create

```
src/app/<route>/
  page.tsx        Server Component — metadata, fetch, JSON-LD, PageShell
  loading.tsx     skeleton matching the page's own layout
  [<id>]/         only for a detail route
    page.tsx
    loading.tsx
```

## `page.tsx`

```tsx
import { getWidgetsListLDSchema } from '@linkedDataSchema/widgets'
import type { Metadata } from 'next'
import { getWidgetsListAPI } from '@api/widgets/main'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import JsonLd from '@components/ui/bare/JsonLd'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Widgets',
  description: 'One sentence a search result would show.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.widgets] },
}

const Widgets = async () => {
  const { allIds, byId } = await getWidgetsListAPI()
  const widgets = allIds.map((id) => byId[id!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getWidgetsListLDSchema(widgets)} />
      <PageHeader title='Widgets' subtitle={allIds.length ? `${allIds.length} listed` : 'Browse'} />
      {widgets.length ? (
        <ResponsiveGrid as='ul'>{/* EntityCard per item */}</ResponsiveGrid>
      ) : (
        <EmptyState title='Nothing here yet' description='…' />
      )}
    </PageShell>
  )
}

export default Widgets
```

For a **detail** route use `generateMetadata` instead of a static `metadata`, and make
sure the API getter is wrapped in `React.cache` — otherwise `generateMetadata` and the
page body each make their own HTTP call:

```tsx
export const generateMetadata: GenerateMetadata<Props> = async ({ params }) => {
  const { widgetId } = await params
  const widget = await getSingleWidgetAPI({ id: widgetId })
  return {
    title: widget.basic.name,
    alternates: { canonical: `${ROUTES[ROUTE_KEYS.widgets]}/${widgetId}` },
  }
}
```

`params` is a **Promise** in this Next version — always `await` it.

## `loading.tsx`

Mirror the page's own structure so the handoff costs no layout shift:

```tsx
import { PageShell } from '@components/ui/layout'
import { CardGridSkeleton } from '@components/ui/skeletons/CardGridSkeleton'

const Loading = () => (
  <PageShell className='flex flex-col gap-6'>
    <div className='flex flex-col gap-2'>
      <div className='bg-surface-sunken h-8 w-48 animate-pulse rounded-brand' />
      <div className='bg-surface-sunken h-4 w-32 animate-pulse rounded-brand' />
    </div>
    <CardGridSkeleton count={8} />
  </PageShell>
)

export default Loading
```

`CardGridSkeleton` is a **named** export and is in no barrel — import it by path.

## Also do

1. **Register the route** in `src/constants/routes.ts`: a `ROUTE_KEYS` entry and a
   `ROUTES` path. `helpers/routes.ts#matchRouteName` does longest-prefix matching, so
   nested paths resolve correctly without extra work.
2. **Navigation** — add to `HEADER_ROUTES` in `src/constants/header.ts` only if the page
   has real content. A nav entry pointing at a stub is a dead end.
3. **JSON-LD** — add a builder under `src/linkedDataSchema/` if the entity is one
   schema.org models. Serialize through `bare/JsonLd`, never `serialize-javascript`.
4. **Do not create a Zustand store** for a page that only reads on the server.

## Verify

```bash
pnpm typecheck && pnpm lint-fix && pnpm build
```

`pnpm build` matters here specifically — a Server Component importing something
client-only (notably `@ant-design/icons`) fails at **build** time, not runtime.

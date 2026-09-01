# Routes — map and conventions

Use the `/route` command to scaffold a new one, and the `design-system` skill for what to
put in it.

## The map

`ƒ` = server-rendered on demand, `○` = prerendered static.

| Route | | State |
|---|---|---|
| `/` | ƒ | Real — marketing landing (hero, category rail, feature bento, providers, CTA) |
| `/providers` | ƒ | Real — explore list with category chip rail |
| `/providers/[providerId]` | ƒ | Real — 2-col profile + calendar booking |
| `/providers/profile-creation` | ƒ | Real — the big profile form |
| `/providers/profile-services` | ƒ | Real — service CRUD |
| `/providers/profile` | ○ | **Stub** (9 lines) |
| `/organizations` | ƒ | Real — list |
| `/organizations/[organizationId]` | ƒ | Real — detail |
| `/categories` | ƒ | Real — list |
| `/categories/[categoryId]` | ƒ | Real — providers in a category |
| `/consumers` | ○ | **Stub** (9 lines) |
| `/consumers/[consumerId]` | ƒ | Thin |
| `/consumers/profile` | ○ | **Stub** (9 lines) |
| `/contact` | ○ | **Stub** (9 lines) |
| `/auth/*` | ○/ƒ | Real — account type → phone → OTP → profile created; own `layout.tsx` |
| `/routes-overview` | ○ | Dev aid; `notFound()` in production |

Stubs are deliberately kept out of `HEADER_ROUTES` (`src/constants/header.ts`) so
navigation does not dead-end. If you make one real, add it there.

Route paths live only in `src/constants/routes.ts` (`ROUTE_KEYS` + `ROUTES`). Never
hardcode a path string in a component.

## Conventions

**Server Components by default.** Pages call the API layer directly:

```tsx
export const dynamic = 'force-dynamic'

const Providers = async () => {
  const { allIds, byId } = await getProvidersListAPI()
  …
}
```

`force-dynamic` is a build workaround, not a design choice — it stops `next build`
prerendering against a missing `NEXT_PUBLIC_API_URL`. See `docs/BACKLOG.md`.

**Do not use a Zustand store for data a page already fetched.** Stores are for client
interactivity. `useSingleProviderStore` is the counter-example, not the model.

**`params` is a Promise** in this Next version — `const { providerId } = await params`.

**Single-entity fetches must go through the `React.cache`-wrapped getter**, or
`generateMetadata` and the page body each make their own HTTP call.

**Every list and detail route gets a sibling `loading.tsx`** mirroring the page's own
layout, so the skeleton→content handoff costs no layout shift.
`/organizations/[organizationId]` is currently the one missing it.

## Files that behave unusually

| File | Why |
|---|---|
| `layout.tsx` | Owns the `viewport` export — without it mobile renders at ~980px and every responsive style is invisible. Font variable goes on `<html>` so antd portals inherit it. |
| `global-error.tsx` | Renders **outside** `ConfigProvider`, so it **cannot use antd**. Inline styles fed from `tokens.ts`. |
| `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` | `ImageResponse`/satori — cannot resolve CSS variables, so they import `tokens.ts` directly. |
| `manifest.ts` | Generated, not a static file. |
| `routes-overview/` | Guarded with `notFound()` in production. |

## Structured data

JSON-LD builders live in `src/linkedDataSchema/`, serialized through
`@components/ui/bare/JsonLd` (which uses `helpers/jsonLd.ts`). Never
`serialize-javascript` — it emits a JavaScript object literal, not JSON, and strict
consumers reject it.

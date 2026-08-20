# Improvements and Organization Notes

This document records what was upgraded in this pass, what was intentionally left behind, and the highest-value code organization and performance work for Bookie.

## Upgrade summary

The app now runs on **Next.js 16.3.1**, **React 19.2.8**, **Ant Design 6.6**, **Tailwind 4.3**, and **TypeScript 6.0.3**. Lint runs through the ESLint CLI (`pnpm lint`) because `next lint` was removed in Next 16.

FullCalendar was migrated from v6 to **v7**: plugins now come from `@fullcalendar/react/*`, a theme plugin plus CSS is required, `stickyHeaderDates` is `tableHeaderSticky`, and `temporal-polyfill` is a peer dependency.

Unused packages were removed: `yup` (never imported), `react-hooks` (unrelated 2016 package), `ts-node` / `ts-node-dev` (`tsx` already covers scripts), and `@types/json-server` (v1 ships its own types). The stale Next 15 security override in `pnpm-workspace.yaml` was replaced with `typescript-eslint` 8.67 overrides so TypeScript 6 is a valid peer of `eslint-config-next`.

`pnpm typecheck`, `pnpm lint`, and `pnpm build` all succeed after these changes.

## Intentionally not upgraded

These are the latest versions, but they are **not compatible** with the current Next/ESLint stack:

| Package | Latest | Why it was not taken |
| --- | --- | --- |
| TypeScript 7.0.2 | Native Go compiler | `typescript-eslint` still needs the TypeScript 6 JS API. TS 6 and 7 are language-identical; 7.1 is expected to restore the API. |
| ESLint 10 | Latest major | `eslint-config-next` 16.3 still depends on plugins that peer-max at ESLint 9. |
| `@types/node` 26 | Matches Node 26 | This machine is on Node 24, so `@types/node` 24 is the correct match. |

Revisit TypeScript 7 and ESLint 10 after Next.js and `typescript-eslint` advertise support.

---

## Code organization

### 1. One source of truth for docs and stack

`.github/copilot-instructions.md` still describes **Redux Toolkit** and “thunks”. The app uses **Zustand** with `immer` + `combine`. DATABASE_STRUCTURE.md points at `src/api/_shared/db.ts` and review types that do not exist. Keep those files in sync with the real tree, or agents and humans will keep generating the wrong patterns.

### 2. Stop dual-writing forms

Every major form uses **Formik and Ant Design `Form` together**. Ant Design already owns field registration, validation, `scrollToFirstError`, and `disabled`/`loading`. Formik duplicates that state. Pick one:

- Preferred: Ant Design Form + `yup`/`zod` via `Form.useForm()` (or Ant Design’s built-in rules, which you already wrap in `useFormItemRules`).
- Alternative: Formik only, and drop `Form.useForm()`.

Right now values live in Formik, rules live in Ant Design, and submit is wired with `onFinish={formik.handleSubmit}`. That split is the main source of form bugs (see `onSubmitButtonClick` in `ProviderProfileForm`, which only checks Ant Design errors).

### 3. Split “server data” from “UI state”

Zustand stores currently own API calls (`getProvidersList`, `getSingleProvider`, `getProviderProfileData`, …). List pages then **also** fetch the same endpoints in Server Components.

A cleaner split:

| Layer | Owns |
| --- | --- |
| Server Components / route handlers | First paint, SEO, JSON-LD |
| TanStack Query (or Next `fetch` cache) | Client refetch, mutations, pending/error |
| Zustand | Session, UI chrome, unsaved form drafts |

`appendSelectors` is a useful pattern; keep it for UI stores. Do not keep a Zustand store that is only a cache of a server page’s props (`useSingleProviderStore` is hydrated with `JSON.parse(JSON.stringify(initialState))` after the page already fetched).

### 4. Collapse duplicated helpers and dead files

- `src/constants/api.ts` is a copy of `paramsToQueryString` from `src/helpers/api.ts` and is unused. Delete it.
- `src/app/_loading.tsx` is not a Next.js convention. Rename to `src/app/loading.tsx` if it should apply globally, or delete it.
- `src/app/providers/ProvidersList.tsx` and `src/app/categories/components/CategoriesList.tsx` are client fetchers that the corresponding `page.tsx` files do not use. Either use them or remove them.
- Root file `h` looks like accidental git-log output. Delete it.
- `src/mock/server.ts` is referenced by `pnpm mock-api` but does not exist. Restore a mock server or drop `json-server` / `express` / `cors` / `kill-port` until you need them.

### 5. Normalize the API module shape

`src/api/<domain>/{endpoints,types,processors,main}.ts` is a good pattern. Inconsistencies to clean up:

- Endpoint paths mix REST (`/providers`) and RPC (`/deleteProviderService`, `/putProviderService`).
- Some processors are identity wrappers; some do real mapping. Name them so it is obvious which responses are trusted as-is.
- Types for entities live under `src/store/.../types.ts` even when the store is unused. Move shared entities to `src/interfaces/` (or `src/domain/`) so Server Components do not import from Zustand files.

### 6. Page components that are only wrappers

`AppBox` is a passthrough `<div>`. `AppButton` / `AppInput` / `AppTitle` earn their keep as design tokens; empty wrappers do not. Either give them real spacing/semantic behavior or stop wrapping.

Route files such as `src/app/providers/profile/page.tsx` and `src/app/categories/page.tsx` are placeholders (`Provider Profile`, `Not working temp`). Either hide them from `HEADER_ROUTES` or finish them so navigation does not dead-end.

### 7. Shared error UI

`src/app/organizations/error.tsx` and `src/app/providers/error.tsx` are copies. Promote one `src/app/error.tsx` (and optionally `global-error.tsx`) and delete the duplicates.

---

## Performance and Next.js usage

### 1. Axios is not memoized across `generateMetadata` and the page

`src/app/providers/[providerId]/page.tsx` (and category/organization detail pages) call the same API in `generateMetadata` and again in the page. Next.js request deduplication only applies to `fetch`. Options:

- Switch these reads to `fetch` with `next: { revalidate, tags }`.
- Or extract `cache(getSingleProviderAPI)` via React `cache()` so metadata and the page share one request.

Until then, every detail page does two HTTP calls per request.

### 2. `force-dynamic` is a temporary build workaround

List and detail routes that hit the API were marked `dynamic = 'force-dynamic'` so `next build` does not prerender against a missing `NEXT_PUBLIC_API_URL`. When a real API exists, prefer:

```ts
export const revalidate = 60
```

or `fetch` cache tags, and generate static params for popular providers/categories.

### 3. JSON-LD should be JSON, not `serialize-javascript`

`serialize-javascript` emits a JS object literal, not JSON. `<script type="application/ld+json">` should use `JSON.stringify`. Using the wrong serializer can produce invalid structured data (functions, `undefined`, single quotes).

### 4. Images

Provider detail still uses `<img>`. Cards use Ant Design `Image`. Prefer `next/image` with explicit sizes for LCP on list and profile pages. Remote hosts must be listed under `images.remotePatterns` in `next.config.ts`.

### 5. Client boundary is too high

`src/components/App.tsx` is a Client Component wrapping **all** pages (header + `ConfigProvider`). That is fine for theme, but keep `children` as the only composition slot so page content can stay a Server Component (this already works). Do not import Zustand or `usePathname` into `layout.tsx`.

Header calls `usePathname()` twice and looks up `ROUTE_KEYS_BY_VALUES[pathName]` without handling query strings or nested IDs (`/providers/123` will not match `/providers`). Derive header config from a prefix match, not an exact path map.

### 6. Calendar slot generation

`generateTimeSlots` runs on every render and builds 18 events with `dayjs`. Memoize on `selectedDate` (and “now” at a 30-minute granularity). `listPlugin` is registered but list view is unused; drop it until the view switcher exists.

### 7. Auth interceptor and cookies

`axiosInstance` sets `withCredentials` only outside development and the 401 handler is empty. Before launch:

- Attach tokens (httpOnly cookie or Authorization header) in one place.
- On 401, clear Zustand auth state and redirect to `ROUTES.accountTypeSelection`.
- Add `src/proxy.ts` (Next 16 replacement for `middleware.ts`) for route protection instead of guarding each page.

`generateEntityUrl` currently prefixes **public site URLs** with `NEXT_PUBLIC_API_URL`. JSON-LD `url` fields should use the site origin (`metadataBase`), not the API origin.

---

## Tooling and DX

1. **`pnpm watch` ports are wrong.** Dev server is port **4141**; the script still `kill-port` 3000/3001. Point it at 4141 and whatever port the mock API uses.
2. **Husky pre-commit is fully commented out.** Either enable `pnpm lint` + `pnpm typecheck` on staged files (`lint-staged`) or remove Husky until you want it.
3. **No `.env.example`.** Document `NEXT_PUBLIC_API_URL` (and later auth keys) so builds and new clones do not fail silently.
4. **`pnpm format` only formats `src/`.** Include `eslint.config.mjs`, `next.config.ts`, and this file, or run Prettier from the repo root.
5. **pnpm itself is 10.x while 11 is current.** Optional: `pnpm self-update` on developer machines; not required for the app.

---

## Suggested order of work

1. Add `.env.example`, restore or remove the mock API, fix `watch` ports.
2. Collapse Formik + Ant Design Form to a single form library.
3. Deduplicate Server Component fetches with React `cache()` or `fetch`.
4. Move entity types out of `src/store` and delete unused list client components.
5. Replace `serialize-javascript` JSON-LD with `JSON.stringify`, switch profile images to `next/image`.
6. Add a real auth story (proxy, 401 handling, persisted session).
7. When `typescript-eslint` supports it, move to TypeScript 7 for faster `next build` typecheck.

These are suggestions only; none of items 1–7 were implemented in the dependency upgrade besides the FullCalendar v7 migration, ESLint flat-config move, lint fixes required by `eslint-plugin-react-hooks` v7, and `force-dynamic` on API-backed routes so production build succeeds without an API.

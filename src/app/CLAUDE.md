# Routes — map and conventions

Use the `/route` command to scaffold a new one, and the `design-system` skill for what to
put in it.

**Before changing a feature, read its design record** — the decisions there are deliberate
and easy to "fix" back by accident:

| Changing | Read |
|---|---|
| Explore (`/providers`): URL state, search suggestions, Suspense, matched service | `docs/routes/explore.md` |
| Public provider page, booking panels, time-zone controls, `/p/[slug]` | `docs/routes/provider-page.md` |
| `/bookings`, `/favorites`, the heart | `docs/routes/bookings-and-favorites.md` |
| A settings tab, the workspace switch | `docs/routes/account-settings.md` |
| Registration, sign-in, Google, become-provider | `docs/routes/auth.md` |
| Plans, `/pricing`, the Plan tab, checkout | `docs/BILLING.md` |

## Every route is under `[lang]`

The root layout is `src/app/[lang]/layout.tsx`, so the paths below are all really
`/[lang]/…`. Only these stay at the app root, because they are locale-agnostic or must sit
beside the root layout: `global-error.tsx`, `not-found.tsx`, `icon.tsx`,
`icon-maskable/route.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`, `manifest.ts`,
`sw.js/route.ts`, `sitemap.ts`, `robots.ts`, `favicon.ico`.

**Write paths without the locale.** `ROUTES` (`src/constants/routes.ts`, the only home of a
path string) is locale-free and `AppLink` adds the prefix; `localePath()` (`@i18n/pathname`)
does it for raw URL strings. A page's `alternates` come from `localizedAlternates()`
(`@i18n/metadata`), so metadata must be `generateMetadata`, not a static `metadata` object,
on any indexable route. See `src/i18n/CLAUDE.md`.

## Rendering

**Today every `[lang]` route builds as `ƒ`** (re-checked 2026-10-01; cause unknown — see
`docs/BACKLOG.md` → *Infrastructure*). The intended state prerenders the routes that read no
`searchParams` once per locale (`/contact`, `/terms`, `/privacy`, `/refund-policy`, most of
`/auth/*`, `/routes-overview`). That needs both `generateStaticParams` in the root layout
**and** `i18n/request.ts` reading `lang()` from `next/root-params`, which keeps next-intl
off `headers()`. Do **not** call `setRequestLocale` — it is deprecated. A page that reads
`searchParams` can never be static. The route-by-route plan is the rendering roadmap in
`docs/DEPLOYMENT.md`.

## The map (under `/[lang]`)

| Route | What it is |
|---|---|
| `/` | Marketing landing. Sign-up actions are guest-only, from a server-side session read (below) |
| `/providers` | Explore — search with suggestions, category rail, filter + sort, paged. State is the query string |
| `/providers/[providerId]` | Public profile: identity + hours + location, booking as three panels, then reviews |
| `/providers/profile` (+ tabs), `/providers/profile-services` | Provider workspace shell (route group `providers/(account)`) |
| `/consumers/profile` (+ tabs) | Consumer account settings |
| `/p/[slug]` | Vanity link — a **Route Handler** that 307s to `/providers/<slug>` |
| `/b/[token]` | Public booking manage page (view / cancel / reschedule) by capability token. A page, not a redirect |
| `/organizations`, `/organizations/[id]`, `/categories`, `/categories/[id]` | Lists and details |
| `/bookings` | Every appointment on the account, either side. Signed-in header destination, `noindex`, proxy-guarded |
| `/favorites` | Providers saved with the heart. Server Component grid, `noindex`, proxy-guarded |
| `/contact` | Contact form, `POST /contact` (below) |
| `/pricing` | Plan comparison + add-ons over `GET /plans`, `/plans/addons`, server-rendered; a signed-in provider's plan, every cheaper one and every add-on it includes render disabled. Paddle islands. Indexed — `docs/BILLING.md` |
| `/terms`, `/privacy`, `/refund-policy` | One `LegalDocument` each over `Legal.<doc>.sections.*`; required by Paddle's review |
| `/billing/checkout` | Where Paddle sends a checkout (`?_ptxn=`); **public**, `noindex` |
| `/billing/return` | Waits (`useAwaitPlan`) until a subscription is live. Proxy-guarded, `noindex` |
| `/auth/*` | The sign-on funnel — `docs/routes/auth.md` |
| `/admin/reviews`, `/admin/providers` | Moderation and plan assignment. `noindex`, not in sitemap or `/routes-overview`. No client guard: the API answers 404 to non-admins, which the page reads as an empty list |
| `/routes-overview` | Dev aid; `notFound()` in production |

**Retired URLs are one-line Route Handlers**: `export const GET = localeRedirect(ROUTES.x)`
(`@i18n/routeRedirect`). The old booking tabs (`/providers/profile/bookings`,
`…/consumer-bookings`, `…/history`, `/consumers/profile/appointments`) 307 to `/bookings`.

### Provider settings tabs

| Tab | Route | Reads / writes |
|---|---|---|
| Approvals | `/providers/profile/approvals` | The approval switch (`PUT /provider-profile`) over its queue (`GET /provider-profile/bookings?status=pending`, `PATCH …/:id/decision`) |
| Analytics | `/providers/profile/analytics` | `StatTile` row + `bare/BarChart`; `GET /provider-profile/analytics` |
| Advanced settings | `/providers/profile/advanced` | Time zone, 12/24-hour clock, visitor clock-choices switch. Drafted like Availability |
| SEO | `/providers/profile/seo` | Title / description / slug, `PATCH /provider-profile/seo` — **saves live, no draft** |
| Plan | `/providers/profile/plan` | Not a sidebar tab. Current plan, usage, upgrade/switch/cancel, add-ons — `docs/BILLING.md` |
| Payouts | `/providers/profile/payouts` | Plan + add-on cards (`GET /provider-profile/plan`), settled charges (`GET /billing/payments`) |
| Notifications | `/providers/profile/notifications` (and consumer side) | Event prefs, then `TelegramConnect` and (providers) `CalendarFeed` — each saves on its own button |

No settings tab autosaves: Discard / Save, plus Save draft / Publish for providers. A
control the plan does not allow is disabled with a link to the Plan tab; the API refuses
the write regardless.

## Cross-cutting rules

- **Any route whose whole job is to redirect is a Route Handler**, never a `page.tsx` — a
  page redirect inside a streaming layout arrives as a soft client navigation with HTTP 200
  and no `Location`. **307, never 308**: a permanent redirect is cached by the browser.
- **`src/proxy.ts` guards signed-in areas on cookie presence only.** Proxy is not an
  authorization layer; enforcement is the API's `requireProvider` / `requireAuth`.
  `PROTECTED_PREFIXES` is a prefix test, so nested tabs are covered; `/bookings` and
  `/favorites` have their own entries there and in `robots.ts`.
- **Booking is not part of the sign-on funnel.** `POST /appointments` is public.
  `BookingPanel` reads the auth store only to decide whether the sheet asks who the visitor
  is — never to gate the action.
- **Header nav** is one bar for every page, configured in `src/constants/header.ts`:
  Providers, Categories, Organizations, then Bookings and Favorites once signed in
  (`withAccountRoutes`), then Pricing, last. Each directory link is omitted when its table
  has no rows (`GET /directory`, read in the locale layout); a failed read keeps them. Below
  `xl` the drawer is the nav; icons beside links wait until `xxl`.
- **The landing page (`/`) reads the session on the server** — `(home)/loadSession.ts`
  answers `null` without `SESSION_COOKIE` (no API call), else `getMeAPI({ cookie })` in
  parallel with the page's fetches. A client island would flash the guest buttons on every
  signed-in load. The footer hides guest-only links from the auth store instead, because
  the root layout must not read the cookie (`Footer.tsx`). The feature lists claim only what
  ships; a new entry needs its key in `FEATURES` and copy in all 16 catalogues.
- **`/contact` fetches nothing on the server**: no `force-dynamic`, no `loading.tsx`.
  Prefill (from `getMe()`) fills only **empty** fields. The hidden `website` field is a
  honeypot — the server drops a submission that fills it and answers success. Nothing is
  stored, so a failed send keeps the values on screen. See the `mail` skill.

## Conventions

**Server Components by default.** Pages call the API layer directly:

```tsx
export const dynamic = 'force-dynamic'

export default async function Providers() {
  const { allIds, byId } = await getProvidersListAPI()
  …
}
```

- **`export default` is required** on file-convention modules — Next resolves them by their
  default binding: `page`, `layout`, `loading`, `error`, `global-error`, `not-found`,
  `template`, `default`, `icon`, `apple-icon`, `opengraph-image`, `twitter-image`,
  `manifest`, `sitemap`, `robots`. Declare it inline (`export default function Page()`).
  Every other file here uses a named export.
- `force-dynamic` is a build workaround (missing `NEXT_PUBLIC_API_URL` at build), not a
  design choice — see `docs/BACKLOG.md`.
- **Do not use a Zustand store for data a page already fetched.** `useSingleProviderStore`
  is the counter-example, not the model.
- **`params` is a Promise** — `const { providerId } = await params`. Type it as
  `params: Promise<{ lang: string }>` only when the page uses a segment; never take it just
  to feed next-intl the locale. Do **not** use the generated `PageProps<'/…'>` /
  `LayoutProps<'/…'>` globals — they need `.next/types`, which a clean CI tree lacks.
- **Single-entity fetches go through the `React.cache`-wrapped getter**, or
  `generateMetadata` and the page body each make their own HTTP call.
- **Every list and detail route gets a sibling `loading.tsx`** mirroring the page's layout.
  Exception: a `loading.tsx` ancestor streams its children as hidden HTML, so a fact that
  must be in the document cannot sit under one. That is why the provider identity column is
  `[providerId]/layout.tsx` and the home and Explore skeletons live in the route groups
  `[lang]/(home)/` and `providers/(explore)/`.

## Error boundaries

**Every `error.tsx` is five lines around `@components/errors/RouteErrorFallback`**, passing
Next's `error` and **`retry`** plus a `description` from `Errors.pages.*` and a `context`.
`retry` re-fetches and re-renders; `reset` only re-renders, so it cannot recover from the
failed fetch that put it there.

A boundary renders inside its own segment's layout but not around it:

| Boundary | Catches |
|---|---|
| `[lang]/error.tsx` | everything not caught lower, inside the app chrome |
| `providers/`, `organizations/`, `categories/` `error.tsx` | the list pages |
| `providers/[providerId]`, `organizations/[organizationId]`, `categories/[categoryId]`, `b/[token]` | one entity (detail copy) |
| `providers/(account)/error.tsx`, `consumers/profile/error.tsx` | a settings panel — `inline`, so the sidebar stays |

A crash in a **layout** goes one level up — in `[lang]/layout.tsx`, to `global-error.tsx`.

- **A dead link is a 404, not an error.** A detail page wraps its `cache()`d getter in a
  loader that calls `notFound()` when `isNotFoundError(e)` and rethrows anything else —
  `loadProvider`, `loadManaged`, `loadCategory`, `loadOrganization`.
- **A Server Component that should degrade rather than throw** (the reviews section)
  catches, calls `reportError`, and renders its own message with `errors/RefreshButton`.

## Files that behave unusually

| File | Why |
|---|---|
| `layout.tsx` | Owns the `viewport` export (without it mobile renders at ~980px). Font variable and `CSS_VAR_SCOPE` go on `<html>`. `appleWebApp` complements `manifest.ts`. |
| `global-error.tsx` | Renders **outside** `ConfigProvider` and next-intl — **no antd, no `useTranslations`**. Inline styles from `tokens.ts`; loads the URL's catalogue in an effect, hardcoded English as fallback. |
| `not-found.tsx` (app root) | 404 for URLs matching **no route**. Above `[lang]/layout.tsx`: no stylesheet or `ConfigProvider`, inline styles, copy in `DEFAULT_LOCALE`, must not render its own `<html>`/`<body>`. |
| `[lang]/not-found.tsx` | 404 for `notFound()` inside `[lang]`. Full chrome, translated, **antd-free** so the crawler gets real HTML. |
| `icon.tsx`, `icon-maskable/route.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` | satori cannot resolve CSS variables — import from `tokens.ts`. Extensionless paths the proxy must not locale-prefix. |
| `manifest.ts` | `start_url`/shortcuts are `/<DEFAULT_LOCALE>…` (`/` is a 307); `id` stays `'/'`; no `orientation` lock. |
| `sw.js/route.ts` | Network-only service worker (`src/helpers/pwa.ts`); registered in production only by `ServiceWorkerRegistrar`. |
| `sitemap.ts`, `robots.ts` | Every indexable route × 16 locales with `alternates` — the only way most locale variants get crawled. |

## Structured data

JSON-LD builders live in `src/linkedDataSchema/`, serialized through
`@components/ui/bare/JsonLd` (`helpers/jsonLd.ts`). Never `serialize-javascript` — it emits
a JavaScript object literal, not JSON.

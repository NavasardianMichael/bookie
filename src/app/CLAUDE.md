# Routes — map and conventions

Use the `/route` command to scaffold a new one, and the `design-system` skill for what to
put in it.

## Every route is under `[lang]`

The root layout is `src/app/[lang]/layout.tsx`, so the paths below are all really
`/[lang]/…` — `/en/providers`, `/es/providers`, one URL per language. Only these stay at
the app root, because they are locale-agnostic documents or must sit beside the root
layout: `global-error.tsx`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`,
`manifest.ts`, `sitemap.ts`, `robots.ts`, `favicon.ico`.

**Write paths without the locale.** `ROUTES` is locale-free and `AppLink` adds the prefix;
`localePath()` (`@i18n/pathname`) does it for raw URL strings. A page's `alternates` come
from `localizedAlternates()` (`@i18n/metadata`), which also emits the 15 `hreflang` links —
so metadata must be `generateMetadata`, not a static `metadata` object, on any indexable
route. See `src/i18n/CLAUDE.md`.

## The map

`ƒ` = server-rendered on demand, `○` = prerendered static.

| Route (under `/[lang]`) | | State |
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
| `/consumers/profile` | ƒ | **Stub** — the only consumer route, and it is private |
| `/contact` | ○ | **Stub** (9 lines) |
| `/terms`, `/privacy` | ○ | Placeholders — registration's consent notice must link somewhere real |
| `/auth/*` | ○/ƒ | Real — see the funnel below |
| `/routes-overview` | ○ | Dev aid; `notFound()` in production |

**Consumers have no public presence, by design.** There is no directory, no detail page,
and no API that would serve one — `GET /consumers` and `GET /consumers/:id` were removed
because they returned every consumer's name and phone number unauthenticated. A consumer
reads and writes only their own record via `/consumer-profile`, behind `requireConsumer`.
`robots.ts` disallows the whole `/consumers/` subtree. Do not add a public consumer route.

Stubs are deliberately kept out of `HEADER_ROUTES` (`src/constants/header.ts`) so
navigation does not dead-end. If you make one real, add it there.

## The sign-on funnel

**Registration is role-specific and sign-in is not.** Which form you open decides the role,
exactly as `design/initial prototype/{consumer,provider}_registration` have it — there is no
account-type toggle inside a form.

```
/auth/account-type-selection      two links, no form state
   ├─→ /auth/consumer-registration   split screen: first/last name, mobile, optional email
   └─→ /auth/provider-registration   card: organization combobox, first/last name, email, phone
                    │
        /auth/code-input            OTP — shared with sign-in
                    │
        /auth/profile-created       role-aware CTA
        ├─ consumer → /providers
        └─ provider → /providers/profile-creation → profile-services → /providers/[id]

/auth/phone-number-input          sign-in for a returning user: phone → OTP → their own area
```

Three things that are easy to get wrong here:

1. **No account is created until the OTP verifies.** A registration form writes a
   `pendingSignOn` record (`src/helpers/localStorage.ts`) and the OTP screen replays it into
   `POST /identity/login`. Nothing hits the API before then.
2. **The OTP screen must not navigate on failure.** It used to `replace(profileCreated)` from
   both the success path and the `catch`, so a wrong code reached the success screen.
3. **`/auth/layout.tsx` is a pass-through.** The funnel's white card is `AuthCard`
   (`@components/ui/layout`), which each step opts into. It cannot live in the layout because
   Next nested layouts compose rather than replace, and the consumer split screen has no card.

`src/proxy.ts` guards the signed-in areas on cookie presence only — Next's docs are explicit
that Proxy is not an authorization layer, so real enforcement stays in the API's
`requireProvider` / `requireConsumer`.

### Where the registration screens deviate from the mockups, and why

Each of these is a decision, not an oversight — do not "fix" them back:

| Mockup | Built as | Why |
|---|---|---|
| Google sign-up button + "Or register with…" divider | Omitted, both | No OAuth exists in the app or server. The divider's only job was separating social from manual entry, so it goes with the button. |
| One free-text phone input | Country `Select` + number, joined by `Space.Compact` | A single field cannot be validated against a country's numbering plan. `libphonenumber-js` needs the country. |
| Provider "Business Name" free text | Organization combobox (debounced `?q=` search) | Two providers at one business should share an `Organization` row, not two unrelated strings. Typed text still creates one. |
| Consumer: mobile + email only | First/last name added | `Consumer.firstName`/`lastName` are non-null, and the mockup left no way to fill them — every consumer would have rendered as the server's "New Consumer". |
| Provider: 3 fields | First/last name added alongside Organization | Same reason: `Provider.firstName`/`lastName` are non-null and were being filled with "New Provider". |
| Fixed `h-11` / `h-12` / `h-14` controls | antd's default control height | `src/styles/CLAUDE.md` invariant 10, and `h-[NNpx]` is a grep gate. |
| `text-5xl` hero headline | `AppTitle size='h1'` | The fluid scale's `display` step is 72px at `lg`, too large for a half-width panel; `h1` caps at 40px. |
| Terms / Privacy as `href="#"` | Real `/terms` and `/privacy` placeholder routes | A dead anchor in a consent notice is worse than a page saying the document is not published. |
| Own header + footer per mockup | The app's global chrome | `Header`/`Footer` are mounted once in `src/components/App.tsx`. Per-route chrome is configured in `src/constants/header.ts`, not duplicated. |

Labels are rendered by `FieldLabel` with an explicit `htmlFor`, **not** antd's
`Form.Item label`. antd puts its label in an `inline-flex` element sized to its content, so
the consumer screen's right-aligned `Required` / `Optional` badge cannot be pushed to the
input's edge without beating antd's unlayered CSS — which would need a `!` suffix, and that
is a grep gate. Because the `Form.Item` then has no `label`, `messageVariables={{ label }}`
must be passed explicitly or the `'Please fill in ${label}'` message renders literally.

Route paths live only in `src/constants/routes.ts` (`ROUTE_KEYS` + `ROUTES`). Never
hardcode a path string in a component.

## Conventions

**Server Components by default.** Pages call the API layer directly:

```tsx
export const dynamic = 'force-dynamic'

export default async function Providers() {
  const { allIds, byId } = await getProvidersListAPI()
  …
}
```

**`export default` is required here** — Next.js resolves these file-convention modules by
their default binding, so a named export breaks routing rather than merely reading oddly:
`page`, `layout`, `loading`, `error`, `global-error`, `not-found`, `template`, `default`,
`icon`, `apple-icon`, `opengraph-image`, `twitter-image`, `manifest`, `sitemap`, `robots`.
Do not "fix" these into named exports.

Everything else in this directory has a free choice, so it follows the repo preference for
a named export: `HomeHeroPreview.tsx`, `[providerId]/components/*`,
`auth/code-input/OTPCodeInput.tsx`.

Where the default is required, still **declare it inline** — `export default function Page()`
rather than `const Page = () => …` plus a trailing `export default Page`. `eslint.config.mjs`
whitelists these file names by glob, so only a sibling component file draws the warning.

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
| `manifest.ts` | Generated, not a static file. Single-locale (default) — a PWA manifest is fetched without page context. |
| `sitemap.ts`, `robots.ts` | App-root, locale-agnostic. The sitemap emits every indexable route × 15 locales with full `alternates`; nothing else links to `/th/categories` except its `hreflang` tag, so this is the only way those get crawled. |
| `routes-overview/` | Guarded with `notFound()` in production. |

## Structured data

JSON-LD builders live in `src/linkedDataSchema/`, serialized through
`@components/ui/bare/JsonLd` (which uses `helpers/jsonLd.ts`). Never
`serialize-javascript` — it emits a JavaScript object literal, not JSON, and strict
consumers reject it.

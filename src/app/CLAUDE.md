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

**Every route under `[lang]` is currently `ƒ`**, verified against `next build`: the
`prerender-manifest` holds only 9 routes, all of them app-root (`icon`, `apple-icon`,
`opengraph-image`, `manifest`, `sitemap`, `robots`, `favicon`, `_not-found`,
`_global-error`). `generateStaticParams` in the root layout is necessary but not
sufficient — **next-intl also needs `setRequestLocale(locale)`** in every page and layout
to render statically, and nothing in `src/` calls it. So the static pages below are static
in intent only; the rows say `ƒ` because that is what the tree does. Calling
`setRequestLocale` is the change that would make them `○`.

| Route (under `/[lang]`) | | State |
|---|---|---|
| `/` | ƒ | Real — marketing landing (hero, category rail, feature bento, providers, CTA) |
| `/providers` | ƒ | Real — explore: debounced search, category chip rail, filter + sort, paged |
| `/providers/[providerId]` | ƒ | Real — 2-col: identity + hours + location; booking as three stacked panels |
| `/providers/profile-creation` | ƒ | Real — the big profile form (onboarding; outside the account settings shell) |
| `/providers/profile` (+ nested tabs) | ƒ | Real — provider account settings shell |
| `/providers/profile-services` | ƒ | Real — service CRUD (same account shell) |
| `/organizations` | ƒ | Real — list |
| `/organizations/[organizationId]` | ƒ | Real — detail |
| `/categories` | ƒ | Real — list |
| `/categories/[categoryId]` | ƒ | Real — providers in a category |
| `/consumers/profile` (+ nested tabs) | ƒ | Real — consumer account settings (private) |
| `/contact` | ƒ | Real — contact form; prefilled from the session, `POST /contact` |
| `/terms`, `/privacy` | ƒ | Placeholders — registration's consent notice must link somewhere real |
| `/auth/*` | ƒ | Real — see the funnel below |
| `/routes-overview` | ƒ | Dev aid; `notFound()` in production |

**Account settings** live under `/consumers/profile` and `/providers/profile` (route group
`providers/(account)` also wraps `profile-services`). Each sidebar tab is a nested route
so Next lazy-loads the panel. Provider phone change lives in the Profile tab's Personal
Information block, not a sidebar item; listing controls (copy URL, publish/unpublish,
delete page) live on that tab's hero, not a Listing sidebar item. Consumers still have `/consumers/profile/phone`. Visual language follows the prototypes; deviations match
registration: keep the global Header/Footer, no dark mode, no password/2FA/security, no
stored card PANs, no autosave (Discard / Save, plus Save draft / Publish for providers).
Provider `listed` hides Explore + public 404; `available` only pauses bookings. The Header
swaps Sign In / Get Started for an avatar when `getMe()` succeeds.

The public provider profile intentionally drops a few prototype pieces: no left-column
Services list (choosing a service is only the booking picker), no map embed (the address
links out to Maps), working hours as their own card above Location, and service cards
with wrapping titles and no icons.

### Explore's state is the query string

`/providers` keeps search, category, filters, sort and page in the URL, and
`providers/exploreParams.ts` is the only module that knows their names. The page parses;
the two client islands patch. Nothing about this list lives in a store.

```
/providers?q=hair&category=<id>&available=true&bookable=true&sort=nameAsc&page=3
```

Why the URL and not `useProvidersListStore`: the grid is a Server Component, so the
query has to survive a round-trip regardless. Keeping it in the address bar gives one
source of truth instead of two, a shareable and back-buttonable result set, and no
provider rows duplicated into client state. **Do not hydrate the list store here** —
`src/store/CLAUDE.md` says the same thing in general terms; this is the concrete case.

Five decisions worth not undoing:

1. **A category chip filters in place; it does not navigate.** The chip patches
   `?category=`, so the visitor's search and sort survive the click, and re-clicking the
   active chip clears it. `/categories/[categoryId]` still exists and is still where
   *View all* leads — those are single-category landing pages, not this rail's target.
2. **Only the search box and the sort/filter pair are client islands.** The chips and the
   pager are plain anchors: they work before hydration, they prefetch, and a crawler can
   follow them. `ui/layout/Pagination` is antd-free for exactly that reason.
3. **The search field is locally controlled and the URL is its output.** Typing cannot
   wait for `searchParams` to come back or the caret stalls, so `params.q` seeds the
   first render only. It `replace`s rather than `push`es — a nine-character search must
   leave one history entry, not nine — with `scroll: false`.
4. **The filter sheet is staged, the search is live.** Toggles collect into a draft and
   only *Show results* navigates, so opening the panel costs no request and two changes
   cost one. The search box is the opposite because live feedback is its whole point.
5. **Only the results subtree suspends.** `<Suspense key={exploreParamsKey(params)}>`
   wraps `ProvidersResults` alone: the heading, search box, rail and toolbar are already
   correct for the new query, so re-rendering them would only make the controls flicker.
   The fallback is `ProvidersResultsSkeleton`, which keeps the section heading — a bare
   `CardGridSkeleton` there dropped it and the grid jumped on every search.

Where Explore deviates from `design/initial prototype/explore_service_providers`:

| Prototype | Built as | Why |
|---|---|---|
| Search + **Location** field + Search button | One debounced search field | `Provider.address` is free text with no geocoding, so a Location box would match strings rather than places — a radius search that is not one. The button goes with the debounce. |
| "Sort by: Recommended" as inline text | Icon `Button` + `Dropdown`, beside *Browse categories* | Paired with the filter control, per the request; the label still shows from `sm` up. |
| Rating badge and star on every card | Omitted | No aggregate rating column exists; see `docs/BACKLOG.md`. |
| "Next: Today, 2 PM" on every card | Omitted | One availability computation per card, per page render. |
| `1 2 3 … 12` pager | Same, as links, elided at ±2 around the current page | Survives 200 pages as well as 12. |

**Picking is three stacked panels; confirming is a sheet.** `ProviderDetails` owns the one
piece of state all three panels share — the chosen service — and renders `ServicePicker`,
then `BookingPanel`, which is `BookingMonth` over `BookingSlots`:

| Step | Question | Notes |
|---|---|---|
| `ServicePicker` | What? | Native radios in labels; everything inside a label is phrasing content, so a service name is a `<strong>`, not a heading |
| `BookingMonth` | Which day? | Month grid, Monday-first. A day with no open slots is `disabled`, not hidden |
| `BookingSlots` | Which time? | Every open time in one flat grid — no paging, no "view more". "Book now" **opens the sheet**; it does not book |
| `BookingConfirmSheet` | Confirm, annotate, identify | `BookingSummary` (a real `<dl>`) + notes + payment methods, plus name/phone/email when the visitor is anonymous |

Three things not to undo here:

1. **No FullCalendar, and no dialog that asks *which time*.** The old view ran a
   month/week/day switcher whose day click opened an `AppSheet` of times, so the day and
   the time were never on screen together and the summary being confirmed sat behind a
   mask. `Calendar.tsx` and `SlotPicker.tsx` are gone; do not reintroduce either.
   FullCalendar consequently has **no usage left in `src/`** — see `docs/BACKLOG.md`.

   `BookingConfirmSheet` is not that dialog and does not reopen the question: service,
   day and time are all still picked in the panels and all still on screen behind it. It
   opens only once they are settled, and *shows* the pick rather than replacing it. It
   exists because a booking needs notes, a payment intent, and — since `POST /appointments`
   is public — a way for someone with no account to say who they are.
2. **The chosen day is derived, not stored.** `BookingPanel` keeps only what the visitor
   *picked*; the day actually shown is that pick while it is still an open day of the
   visible month, and the soonest open day otherwise. One rule covers the empty first
   paint (the store hydrates in an effect), a service swap that re-steps every day, and
   paging the month. `react-hooks/set-state-in-effect` is an ESLint **error** here, so
   syncing it back into state is not an option either.
3. **Days travel as `DAY_KEY_FORMAT` strings.** That is already the key `countSlotsByDay`
   returns, and it keeps date parsing to the single site that needs a real `Date`. Any
   module that parses one must `dayjs.extend(customParseFormat)` itself — `booking.ts`
   extends it for `booking.ts` only.

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

/auth/phone-number-input          sign-in for a returning user: phone → OTP
        ├─ consumer → /
        └─ provider → /providers/profile
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

**Booking is not part of that funnel.** `POST /appointments` is public: a visitor books
without an account, and any signed-in visitor books as themselves whatever their role.
`BookingPanel` reads `isSignedOn` / `isPending` from the auth store only to decide whether
the sheet needs to ask who they are — never to gate the action.

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

### The contact page

Nothing is fetched on the server, so the page carries **no `force-dynamic`** and no
`loading.tsx` — there is no server round-trip for a skeleton to cover. `ContactForm.tsx`
is the only client island, and it is what reads the session.

Three things not to undo:

1. **Prefill fills only empty fields, once, guarded by a ref.** The name arrives with
   `getMe()` and the email needs a further profile request (`Session` carries no email —
   consumer reads `basic.email`, provider `details.email`), so a visitor can easily start
   typing between the two. Overwriting what they wrote is the bug this prevents.
2. **A failed prefill is logged, not shown.** The field is left empty and the visitor
   types their own address; an error banner would be about something they never asked for.
3. **The hidden `website` field is a honeypot, not dead markup.** It is a nameless-looking
   `Form.Item name='website'` with `noStyle` inside an `aria-hidden` `hidden` wrapper, so
   it reaches the DOM a bot parses but no person or screen reader. The server drops any
   submission that has it set — and answers with a plain success, because telling a bot it
   was caught only teaches it to leave the field alone.

Nothing is stored server-side, so a failed send keeps the form's values on screen and
shows the error. See `server/CLAUDE.md` and the `mail` skill.

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
| `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` | `ImageResponse`/satori — cannot resolve CSS variables, so they import `tokens.ts` directly. Served at `/icon` etc. with no file extension; `src/proxy.ts` must not locale-prefix those paths. |
| `manifest.ts` | Generated, not a static file. Single-locale — `start_url` is `/<DEFAULT_LOCALE>`, not `/`, because localePrefix is always and `/` is a 307. |
| `sitemap.ts`, `robots.ts` | App-root, locale-agnostic. The sitemap emits every indexable route × 15 locales with full `alternates`; nothing else links to `/th/categories` except its `hreflang` tag, so this is the only way those get crawled. |
| `routes-overview/` | Guarded with `notFound()` in production. |

## Structured data

JSON-LD builders live in `src/linkedDataSchema/`, serialized through
`@components/ui/bare/JsonLd` (which uses `helpers/jsonLd.ts`). Never
`serialize-javascript` — it emits a JavaScript object literal, not JSON, and strict
consumers reject it.

# i18n — invariants

16 locales, `next-intl` with **prefixed routing**: every route lives under `app/[lang]/`
and every URL names its language (`/en/providers`, `/es/providers`). Catalogues are
`src/messages/<locale>.json`, `en.json` the source of truth.

**Adding or changing copy, or adding a locale → the `translations` skill.** It has the
namespace map, the every-key-in-16-files rule, `Validation.required`, plurals and
placeholders for inflected languages, and the full add-a-locale checklist (including the
three server twins).

## The locale is a path segment

The root layout is `app/[lang]/layout.tsx`, so each language is a distinct, crawlable URL
with its own canonical, `hreflang` set and JSON-LD. `localePrefix: 'always'` — English is
prefixed too, so no locale is a special case.

- **`next/root-params` works.** Any Server Component or server utility can `await lang()`;
  `currentLocale()` in `metadata.ts` wraps it. `i18n/request.ts` reads it, so next-intl
  never falls back to `headers()`. Do not use `setRequestLocale` (deprecated).
- **`ROUTES` never contains a locale.** The prefix is added at the edges: `AppLink` for
  links, `localePath()` for URL strings. That keeps `matchRouteName` / `isRouteActive`
  matching bare paths.
- **Never import `next/link` or `next/navigation` for an internal destination** — use
  `@i18n/navigation` (`Link`, `redirect`, `usePathname`, `useRouter`). A raw `next/link`
  emits an unprefixed href, which costs a redirect per click and drops the locale. Gated by
  `pnpm gates`. `notFound` / `redirect` from `next/navigation` are fine in Server Components
  that are not building an internal href.
- **A retired URL gets `localeRedirect(target)`** (`routeRedirect.ts`), a `GET` Route
  Handler factory that 307s in the caller's locale (falling back to `DEFAULT_LOCALE`).

## Resolution order

The URL is authoritative. `src/proxy.ts` only decides where *unprefixed* traffic lands:

```
/es/providers   → es, always. The URL wins; nothing overrides it.

/providers      → 1. the NEXT_LOCALE cookie      (an explicit switcher choice)
                  2. Accept-Language negotiation  (first visit)
                  3. DEFAULT_LOCALE ('en')
```

- **That redirect is personalized, so `personalizedRedirect()` sets
  `Vary: Accept-Language, Cookie` and `Cache-Control: no-store`.** Without them a shared
  cache replays the first visitor's language for everyone. It cannot reproduce under
  `next dev` — pinned by `tests/unit/i18n/proxy.spec.ts`.
- **307, never 308** — a browser-cached 308 would outlive the language switcher.
- **Content pages under a prefix never get `Vary: Accept-Language`** — the URL already
  carries the language.
- **We negotiate `Accept-Language` ourselves.** `routing.ts` sets `localeDetection: false`
  and `proxy.ts` calls `matchAcceptLanguage`, because next-intl lets an exact match on a
  lower-preference tag beat a best-fit on a higher one (`pt-PT,en;q=0.9` → `en`).
  `matchAcceptLanguage` treats quality as the outer loop. Pinned by
  `tests/unit/i18n/matchAcceptLanguage.spec.ts`. Do not re-enable `localeDetection`.
- **Provider pages:** `/es/providers/abc` renders Spanish whatever the provider chose. Their
  own language is meant to become the page's `x-default` and the target of a bare
  `/providers/abc` (needs the `locale` column — not built yet).

## SEO — two metadata tiers, picked by whose words are on the page

| | Helper | Emits | Use for |
|---|---|---|---|
| **Our copy, genuinely translated** | `localizedAlternates()` | self-canonical + 16 `hreflang` + `x-default` | landing, provider/category/organization **lists**, category detail, legal pages, contact |
| **User-authored, identical in every locale** | `consolidatedAlternates()` | one canonical, **no `hreflang`** | provider **detail** pages |

- First tier: each locale variant is **self-canonical** — pointing all 16 at one canonical
  would deindex the other 15.
- Second tier: a provider's content is identical on all 16 URLs, so they consolidate onto
  one canonical. Leaving them out of the sitemap would not achieve that — canonical is the
  mechanism, the sitemap only a hint.
- **Never emit both** a cross-canonical and an `hreflang` set; Google then ignores the
  `hreflang`.
- Undecided: organization detail pages probably belong in the second tier; consumer detail
  pages arguably want `noindex`.
- **Entity `@id`s stay locale-free; page URLs do not.** `#person` / `#organization` must
  match across locales; only `WebPage` carries the locale, and its `url` equals the page's
  canonical.

Where: canonical + alternates `metadata.ts`; every route × locale `src/app/sitemap.ts`;
crawl rules `src/app/robots.ts`; `inLanguage` `src/linkedDataSchema/`.

## Server vs client

| | Use |
|---|---|
| Server Component | `getTranslations()` from `next-intl/server` |
| Client island | `useTranslations()` from `next-intl` |
| Formatting anywhere | next-intl's formatter (`Intl` under the hood), locale per call |

**Never call `dayjs.locale()` on the server.** It sets a module global, so two concurrent
requests in different languages race. `setDayjsLocale` (`dayjs.ts`) is client-only, called
once from `App.tsx`. dayjs stays the parser for the locale-blind persistence formats
(`'HH:mm'`, `'YYYY-MM-DD'`), which round-trip identically in every locale — the Arabic
locale's `postformat` digit mapping is never called by dayjs core. Do not "fix" it.

## The two library bridges

- **antd** — `antdLocale.ts` resolves the bundle **on the server** and `layout.tsx` passes it
  to `ConfigProvider` as a prop, so only the active locale crosses the RSC boundary. This
  works because antd's locale bundles are pure data; if one ever gains a function, it has
  to become a client-side import.
- **dayjs** — `dayjs.ts` imports all 16 statically and switches synchronously; an async load
  would flash English month names and desync hydration.

Fonts per script (`--font-script`, appended after Manrope) are `src/styles/CLAUDE.md`
invariant 7 and `src/styles/fonts.ts`. next/font arguments must be written literals — do not
DRY `fonts.ts`.

# i18n — invariants

15 locales, `next-intl` with **prefixed routing**: every route lives under `app/[lang]/`
and every URL names its language (`/en/providers`, `/es/providers`). Message catalogues
live in `src/messages/<locale>.json`, one file per locale, `en.json` is the source of truth.

```
en · es · pt-BR · fr · it · de · ar · zh-CN · ja · hy · id · ko · uk · pl · th
```

A region subtag appears only where it disambiguates a market whose copy differs —
`pt-BR` (not `pt-PT`) and `zh-CN` (Simplified, not `zh-TW`). Everything else is a bare
language code.

## The locale is a path segment

Everything follows from this. The root layout is `app/[lang]/layout.tsx`, so each language
is a distinct, crawlable URL with its own canonical, `hreflang` set and JSON-LD.
`localePrefix: 'always'` — English is prefixed too, so no locale is a special case in the
proxy, sitemap or canonical logic.

What it gives you:

1. **`next/root-params` works.** `lang` is a segment *above* the root layout, so any Server
   Component or server utility can `await lang()` with no prop drilling. `currentLocale()`
   in `metadata.ts` wraps it.
2. **Static rendering.** `generateStaticParams` in the root layout prerenders all 15
   locales — 309 pages at last build, against 20 before.
3. **Real `hreflang`.** `localizedAlternates()` emits all 15 plus `x-default` on every
   indexable page.

**`ROUTES` never contains a locale.** Every path constant is locale-free and the prefix is
added at the edges: `AppLink` for links, `localePath()` for anything building a URL string.
That is what keeps `matchRouteName` / `isRouteActive` matching the bare paths their tests
pin.

**Never import `next/link` or `next/navigation` directly for an internal destination** —
use `@i18n/navigation` (`Link`, `redirect`, `usePathname`, `useRouter`), which adds and
strips the prefix. `AppLink` already does this, so most call sites get it for free.

## Resolution order

The URL is authoritative. `src/proxy.ts` only decides where *unprefixed* traffic lands:

```
/es/providers   → es, always. The URL wins; nothing overrides it.

/providers      → 1. the NEXT_LOCALE cookie      (an explicit switcher choice)
                  2. Accept-Language negotiation  (first visit)
                  3. DEFAULT_LOCALE ('en')
```

So `Accept-Language` now decides **one thing only**: which locale a visitor lands on when
they arrive without a prefix. It never overrides a URL. Once a visitor is on `/es/...`,
their browser can say `ja` all it likes — the page stays Spanish, and every link keeps
them there. That is what makes the content pages cacheable per-URL, which the cookie-only
design could not be.

### The redirect is personalized, so it must not be cached

The unprefixed-entry redirect and the auth-guard redirect both depend on *who is asking* —
cookie, `Accept-Language`, session. `personalizedRedirect()` in `proxy.ts` therefore sets:

```
Vary: Accept-Language, Cookie
Cache-Control: no-store
```

Without them a shared cache (the CDN in front of the app, a corporate proxy) may store the
first visitor's target under the bare URL and replay it for everyone — one Spanish visitor
hitting `/providers` would send every later visitor to `/es/providers`. **This cannot
reproduce locally**, because `next dev` has no shared cache in front of it, which is what
makes it worth a test rather than a manual check (`tests/unit/i18n/proxy.spec.ts`).

The status stays **307, never 308**: a permanent redirect is cached by the browser itself
and would pin a visitor to the first language they ever negotiated, quietly outliving the
language switcher.

Content pages under a prefix must **never** gain `Vary: Accept-Language` — the URL already
carries the language, and adding it would fragment the cache by browser locale for no gain.

**Provider pages:** `/es/providers/abc` renders Spanish even if that provider chose French.
The URL has to win or it would lie to the crawler, which is the whole reason the locale is
in the path. The provider's own language is instead the page's **`x-default`** and where a
bare `/providers/abc` redirects — so a shared link still opens in their language while all
15 stay independently indexable. The `x-default` override is Phase 4; it needs the `locale`
column.

## We negotiate Accept-Language ourselves, on purpose

`routing.ts` sets `localeDetection: false` and `proxy.ts` calls `matchAcceptLanguage`
instead. next-intl's built-in detection lets an **exact** match on a lower-preference tag
beat a **best-fit** match on a higher-preference one. Measured against
`@formatjs/intl-localematcher` 0.8.13 with our locale set:

```
pt-PT,en;q=0.9   → en    (should be pt-BR)
zh-TW,en;q=0.9   → en    (should be zh-CN)
es-419,en;q=0.9  → en    (should be es)
```

A secondary English preference is near-universal in browsers, so this would have sent a
large share of exactly the markets we are adding to the English site. `matchAcceptLanguage`
treats **quality as the outer loop** — each tag resolved exactly, then by primary subtag,
before the next-preferred tag is tried — and gets all three right. Pinned by
`tests/unit/i18n/matchAcceptLanguage.spec.ts`. Do not re-enable `localeDetection`.

### Grep gates

Both return **0**. The first is the one that matters: a raw `next/link` produces an
unprefixed href, which costs a proxy redirect on every click and briefly drops the
locale. It caught `EntityCard.tsx` — every provider, category and organization card on the
site — the day it was written.

```bash
grep -rn "from 'next/link'" src --include=*.tsx                        # 0
grep -rn "from 'next/navigation'" src --include=*.tsx | grep -v notFound  # 0 — use @i18n/navigation
```

`notFound` and `redirect` from `next/navigation` are fine in Server Components that are
not building an internal href.

## SEO surface

| Concern | Where |
|---|---|
| canonical + 15 `hreflang` + `x-default` | `localizedAlternates()` in `metadata.ts` |
| every route × locale, with alternates | `src/app/sitemap.ts` |
| crawl rules, sitemap pointer | `src/app/robots.ts` |
| `inLanguage`, per-locale page URLs | `src/linkedDataSchema/` |

### Two metadata tiers — pick by whose words are on the page

| | Helper | Emits | Use for |
|---|---|---|---|
| **Our copy, genuinely translated** | `localizedAlternates()` | self-canonical + 15 `hreflang` + `x-default` | landing, provider/category/organization **lists**, category detail, terms, privacy, contact |
| **User-authored, identical in every locale** | `consolidatedAlternates()` | one canonical, **no `hreflang`** | provider **detail** pages |

For the first tier, each locale variant is **self-canonical** — `/es/categories` canonicals
to itself, never to `/en/categories`. Pointing all 15 at one canonical would tell Google the
other 14 are duplicates and deindex them, which is the opposite of the point. `hreflang` is
the tag that says "same page, different language".

For the second tier the reverse holds. Translation is scoped to UI chrome, so a provider's
name, services and descriptions are identical on all 15 of their URLs — only the buttons
change. Fifteen index entries per provider that differ in button labels multiply crawl
budget by 15 and serve nobody: no one searches a provider's name and wants the Thai-chrome
version. So they consolidate onto one canonical.

**Leaving them out of the sitemap would not have achieved this.** Absence from a sitemap is
not a noindex — Google reaches `/es/providers/<id>` from the Spanish list page's own links,
and from the `hreflang` set the page used to advertise. Canonical consolidation is the
mechanism; the sitemap is only a discovery hint.

**And never emit both.** A cross-canonical and an `hreflang` set contradict each other —
`hreflang` asks for all of them to be indexed as variants, the canonical asks for one.
Google resolves that by ignoring the `hreflang`, so emitting both is noise.

Still open, same question, not yet decided: **organization detail** pages have the same
shape (user-authored name and description, translated chrome) and probably belong in the
second tier. **Consumer detail** pages are personal and arguably want `robots: noindex`
outright rather than either tier.

**Entity `@id`s stay locale-free; page URLs do not.** A provider is one real-world entity
that all 15 pages share, so `#person` / `#organization` ids must match across locales for
`publisher` and `about` references to resolve. Only `WebPage` — genuinely a different
document per language — carries the locale, and its `url` must agree with that page's
canonical.

## Server vs client

| | Use | Why |
|---|---|---|
| Server Component | `getTranslations()` from `next-intl/server` | Async; the 20 pages are all Server Components |
| Client island | `useTranslations()` from `next-intl` | Hook; only the ~31 `'use client'` files |
| Formatting anywhere | next-intl's formatter (`Intl` under the hood) | Takes the locale per call |

**Never call `dayjs.locale()` on the server.** It sets a module global, so two concurrent
requests in different languages would race and one would render in the other's language.
`setDayjsLocale` (`dayjs.ts`) is client-only, called once from `App.tsx`; the server
formats through `Intl` instead. dayjs stays the parser for the locale-blind persistence
formats (`'HH:mm'`, `'YYYY-MM-DD'`) and antd's pickers read their month and weekday names
off it.

Verified and easy to mistake for a bug: the Arabic dayjs locale defines `postformat`, which
maps digits to Arabic-Indic (`٠٩:٣٠`), but **dayjs core never calls it**. `'HH:mm'` and
`'YYYY-MM-DD'` round-trip identically in every locale, so persistence keys are safe. Do not
"fix" this by stripping the locale.

## The two library bridges

- **antd** — `antdLocale.ts` resolves the bundle **on the server** and `layout.tsx` passes
  it to `ConfigProvider` as a prop. Only the active locale's ~6-10KB crosses the RSC
  boundary and none of the 15 enter the client bundle. This works only because antd's
  locale bundles are pure data — verified, zero functions at any depth. If a future antd
  version adds one, this has to become a client-side import keyed on the locale.
- **dayjs** — `dayjs.ts` imports all 15 statically (~19KB raw, ~6KB gzipped) and switches
  synchronously. An async load would flash English month names for a frame and desync
  hydration; the bytes are the cheaper side of that trade.

All 15 locales exist in both libraries, Armenian (`hy_AM` / `hy-am`) included — usually the
one missing. Nothing here is hand-written.

## Fonts

Manrope covers Latin, Cyrillic and Greek and **nothing else**. Six locales need a second
family, wired in `src/styles/fonts.ts` and all sharing `--font-script`; only the active
one's class goes on `<html>`.

```
--font-stack: var(--font-app), var(--font-script, system-ui), system-ui, …
```

The script face is **appended after** Manrope, not swapped in, so per-glyph fallback keeps
Latin text in Manrope inside an Arabic or Japanese UI. `--font-script` is read through a
`var()` fallback rather than given a `:root` default, because `:root` and next/font's
generated class have identical specificity — the same collision that forced `--font-app` to
exist instead of `--font-sans` (`src/styles/CLAUDE.md` trap 2).

Two things that will bite:

- **next/font arguments must be written literals.** A shared options object fails the build
  with "Font loader values must be explicitly written literals". The repetition in
  `fonts.ts` is required; do not DRY it.
- **`subsets` does not restrict what is served.** next/font never puts a `subset` param on
  the Google CSS request, so every `unicode-range` slice is downloaded and self-hosted
  regardless; `subsets` only decides which files get a `<link rel="preload">`. Manrope
  therefore already renders Polish and Ukrainian on `subsets: ['latin']`. The script faces
  are all `preload: false` — preloading is global rather than per-locale, so preloading six
  would cost every visitor five fonts they cannot read.

## Adding a locale

1. Add the code to `LOCALES` and a native-language label to `LOCALE_LABELS` (`config.ts`) —
   endonyms only, never translated: someone who cannot read the current UI still has to
   find their own language.
2. Add its antd loader (`antdLocale.ts`) and dayjs import + id (`dayjs.ts`). Check both
   exist in `node_modules` first.
3. If its script is not Latin/Cyrillic/Greek, add a face in `src/styles/fonts.ts` and map
   it in `SCRIPT_FONT_CLASSES`.
4. Add `src/messages/<locale>.json` with **every** key. A missing key must fail, not fall
   back silently.
5. If it is RTL, add it to `RTL_LOCALES` in `config.ts` and sweep the layout at `dir="rtl"`.

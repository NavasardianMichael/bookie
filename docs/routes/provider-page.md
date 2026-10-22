# Public provider page — `/p/[slug]`

Design record for the public profile and its booking flow. The rules that apply to every
route are in `src/app/CLAUDE.md`; read this before changing the page, the booking panels,
its URL, or what it tells search engines.

## Layout

The page intentionally drops a few prototype pieces: no left-column Services list
(choosing a service is only the booking picker), no map embed (the address links out to
Maps), working hours as their own card above Location, service cards with wrapping titles
and no icons, and no "Book an appointment" column heading — the service picker is the
start of that flow. Share is an icon in the identity card's top-end corner rather than the
prototype's full-width Share button.

**There is no `loading.tsx` on this page, on purpose.** A loading boundary streams the page
behind a fallback: Next sends the resolved part as `<div hidden>` until an inline script
reveals it, so a crawler or a preview that does not run scripts never sees the services or
the reviews, and a missing provider's `notFound()` fires after the `200` is sent — a `200`
with a noindex meta instead of a `404`. With no boundary here or above (the two loading files
nearby live in route groups that do not contain this page — `[lang]/(home)/` and
`providers/(explore)/`), the whole page renders before the first byte. `[slug]/layout.tsx`
paints the identity column and the JSON-LD; the page renders the booking column and reviews.

## Picking is three stacked panels; confirming is a sheet

`ProviderDetails` owns the one piece of state all three panels share — the chosen
service — and renders `ServicePicker`, then `BookingPanel`, which is `BookingMonth` over
`BookingSlots`:

| Step | Question | Notes |
|---|---|---|
| `ServicePicker` | What? | Native radios in labels; everything inside a label is phrasing content, so a service name is a `<strong>`, not a heading |
| `BookingMonth` | Which day? | Month grid, Monday-first. A day with no open slots is `disabled`, not hidden. Spill-over days from neighbouring months follow the same rule — slots are stepped across the whole grid — and picking one pages the grid to its month |
| `BookingSlots` | Which time? | Every open time in one flat grid — no paging, no "view more". "Book now" **opens the sheet**; it does not book |
| `BookingConfirmSheet` | Confirm, annotate, identify | `BookingSummary` (a real `<dl>` of the pick, including preferred payment) + notes + payment methods, plus name/phone/email when the visitor is anonymous. After create: share / copy URL / copy details / generate QR |

**When the provider is not taking bookings online, `BookingClosedNotice` replaces
`BookingPanel`.** `details.onlineBooking` is `paused` (their `available` switch) or `full`
(their monthly allowance spent); either way the notice says so without naming a plan and
offers the provider's phone and email. `ServicePicker` stays, retitled *Services*: it is
the page's only list of what they offer. A submit refused mid-visit with
`BOOKING_ERROR_CODES` closes the sheet and flips to the notice locally
(`getBookingClosedReason`), since no other time would go through either.

`?service=<id>` (from an Explore card) starts booking with that service selected;
`?reviewPage=` pages the review list, and the pager's hrefs carry `#reviews`.

## Four things not to undo

1. **No FullCalendar, and no dialog that asks *which time*.** The old view ran a
   month/week/day switcher whose day click opened an `AppSheet` of times, so the day and
   the time were never on screen together. `Calendar.tsx` and `SlotPicker.tsx` are gone;
   do not reintroduce either. FullCalendar has **no usage left in `src/`** — see
   `docs/BACKLOG.md`.

   `BookingConfirmSheet` is not that dialog: service, day and time are all still picked in
   the panels and still on screen behind it. It opens only once they are settled, and
   exists because a booking needs notes, a payment intent, and — since `POST /appointments`
   is public — a way for someone with no account to say who they are.
2. **The chosen day is derived, not stored.** `BookingPanel` keeps only what the visitor
   *picked*; the day shown is that pick while it is still an open day of the visible month,
   and the soonest open day otherwise. One rule covers the empty first paint (the store
   hydrates in an effect), a service swap that re-steps every day, and paging the month.
   `react-hooks/set-state-in-effect` is an ESLint **error**, so syncing it back into state
   is not an option. A catalogue of one service starts selected. The only open time on the
   day shown is selected the same way — derived, not written back. A picked time holds
   while it is still open; several open times stay unpicked, and a time already requested
   on this visit does not count as open. Book now scrolls to the first step still empty
   (service list, then calendar, then times) and opens the sheet only once both are set.
3. **Days travel as `DAY_KEY_FORMAT` strings** — the key `countSlotsByDay` returns. Any
   module that parses one must `dayjs.extend(customParseFormat)` itself.
4. **Every booked time is an instant on the provider's clock.** `BookingPanel` passes
   `details.timeZone` to the slot helpers and `BookingMonth` (whose "today" is the
   provider's). The public `BookingSlots` header is a UTC-offset control (GMT−12 … GMT+12)
   plus a 12/24-hour switch. Each starts on the provider's own choice, so the times do not
   move until the visitor picks, and either control only changes how instants are printed —
   the calendar day and the booked slot stay on the provider's clock. Opening hours reprint
   on the same offset and clock, and say which day when a shift crosses midnight. The
   provider can turn both controls off (`details.showClockChoices`); the header then names
   the zone. The confirm summary prints on the clock the buttons showed; a visitor whose own
   clock differs also sees their time. A provider with no zone set is read in the visitor's
   zone and the page names the zone instead of offering the control. `/b/[token]` keeps the
   written zone name. See *Time zones* and *12- or 24-hour clock* in
   `docs/DATABASE_STRUCTURE.md`.

## One URL per provider: `/p/<key>`

The page lives at **`/p/<slug ?? id>`** — the provider's custom slug when they set one, else
their id. It is the **one page route without a locale segment**: the language rides in
`?lang=`, so each provider has exactly one indexable URL rather than sixteen. `/providers`
stays the Explore list.

- **`src/proxy.ts`** *rewrites* a bare `/p/<key>` to `/<locale>/p/<key>` — the address bar
  keeps the canonical URL while the app renders under its `[lang]` root. The locale is
  `?lang=` when it names one of ours, else the `NEXT_LOCALE` cookie the language switcher
  writes, else `Accept-Language`. Crawlers send neither, so the indexed copy is English.
- **A locale-prefixed `/<lang>/p/<key>`** (the old vanity links) and **`/<lang>/providers/<key>`**
  (the old page, `providers/[providerId]/route.ts`) are **308s** to `/p/<key>?lang=<lang>`:
  permanent, because the move is, which is what carries an indexed URL's standing over. Both
  are real redirects — a proxy branch and a Route Handler — never a page calling
  `redirect()`, which streams first and degrades to a client-side navigation with no
  `Location`.
- **Every link is built by `providerPagePath` / `providerPageUrl`** (`@helpers/entities`), so
  every payload that links to a page carries `slug`. `AppLink` and `useRouter`
  (`@i18n/navigation`) send `/p/...` through Next unprefixed (`isLocaleFreePath`); prefixed, it
  would cost a 308. On this page the language switcher sets `?lang=` instead of a path segment.
- **The canonical is always `/p/<current slug ?? id>`**, built from the resolved provider, never
  the route segment — the page also answers to its id and to slugs the provider gave up — and
  there is no hreflang, which would contradict it.
- **Slugs given up keep working.** `ProviderSlugHistory` remembers them; `GET /providers/:key`
  resolves id → current slug → remembered slug (`server/src/services/providerLookup.ts`), and
  the page it opens names the current slug as canonical. A provider who claims a slug another
  one abandoned takes it over: only a *current* slug blocks a claim.

## What the page tells search engines

The `<title>` and meta description are the SEO tab's overrides when set, else composed from
the profile by `@helpers/providerSeo` — the same helpers the SEO tab's preview uses:

- **Title:** `Name | Categories | Organization | Country`. The country is there because
  "<service> <country>" queries match on title words; the address is free text of any length,
  so it goes in the description, the page body and the JSON-LD instead.
- **Description:** `Book an appointment with Name | Categories | Services | Address, Country.`
  in the reader's language, at most 300 characters, cut at a word. The intro's own closing mark
  (`.`, `։`, `。`…) ends the line. The organization is left out (it is in the title).

The SEO tab's boxes show what the page actually uses: the override, or else the generated
value. **A box still holding the generated text saves as no override** (`toOverride`), so it
keeps following the profile; only an edit becomes an override. The tab once saved the
prefilled text as-is, which froze it — a later service or category change no longer reached
the title — and providers who saved then still carry such an override until they edit or
clear it. The manual description cap is 300, the generated one's; the generated title is not
held to the 60-character cap, which applies to the provider's own text.

The JSON-LD graph (`src/linkedDataSchema/providers.ts`) is a `ProfilePage` (`datePublished`,
`dateModified`, `inLanguage`, breadcrumb) about a `ProfessionalService` (address,
`areaServed` country, opening hours, offers, rating, `ReserveAction`) and a `Person`, all on
the canonical URL. `next.config.ts` lists the AI crawlers in `htmlLimitedBots`, so they get the
metadata in `<head>` rather than streamed into `<body>`; `robots.ts` names them, and
`/llms.txt` lists every provider with their categories and services.

**The sitemap lists every listed provider** at its canonical URL with `lastmod` =
`Provider.seoUpdatedAt`, which the API moves only when something search engines see changed —
see *The public page's change stamp* in `docs/DATABASE_STRUCTURE.md`.

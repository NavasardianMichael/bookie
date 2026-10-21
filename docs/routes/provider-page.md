# Public provider page — `/providers/[providerId]` and `/p/[slug]`

Design record for the public profile and its booking flow. The rules that apply to every
route are in `src/app/CLAUDE.md`; read this before changing the page, the booking panels,
or the vanity link.

## Layout

The page intentionally drops a few prototype pieces: no left-column Services list
(choosing a service is only the booking picker), no map embed (the address links out to
Maps), working hours as their own card above Location, service cards with wrapping titles
and no icons, and no "Book an appointment" column heading — the service picker is the
start of that flow. Share is an icon in the identity card's top-end corner rather than the
prototype's full-width Share button.

**The identity column is the segment layout, not the page.** `loading.tsx` wraps the
page in Suspense, and Next streams the resolved page as `<div hidden>` until an inline
script reveals it. A document preview and a crawler that does not run that script never
see what is in there. So `[providerId]/layout.tsx` paints the card, the phone number as
visible text, working hours, and the JSON-LD; `[providerId]/loading.tsx` skeletons only the
booking column. The two ancestor loading files live in route groups that do not contain
this page — `[lang]/(home)/` (home skeleton) and `providers/(explore)/` (Explore skeleton).
The URLs are unchanged.

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

## The vanity link `/p/[slug]`

**It is a `route.ts`, not a `page.tsx`.** As a page it emitted a *soft* redirect: the
root layout streams first, so by the time `redirect()` threw the response had begun and
Next fell back to a client-side navigation — HTTP 200, an empty shell, no `Location`.
Worthless to a crawler, which is the one audience a shareable link has.

It takes **no database round-trip**: `GET /providers/:idOrSlug` accepts either form, so
`/p/<slug>` is a pure rewrite to `/providers/<slug>`, and an unknown slug 404s through the
detail page's own `notFound()`. **307, never 308** — a permanent redirect is cached by the
browser and would outlive a slug change.

Two URLs reaching one page is not a duplicate: `generateMetadata` builds its canonical
from the **resolved entity's id**, not the route segment, so `/providers/<slug>` and
`/providers/<uuid>` both canonical to the id URL.

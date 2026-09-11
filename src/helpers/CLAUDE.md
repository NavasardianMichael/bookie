# Helpers — reuse index

**Check this table before writing any utility.** Most of what gets re-implemented here
already exists; the point of this file is that you can answer "does that exist?" without
opening 17 modules.

Everything here is pure and framework-free unless the last column says otherwise.

## What do you need?

| Need | Use | From |
|---|---|---|
| Bookable slots for a date / range | `getSlotsForDate`, `getSlotsForDateRange` | `booking.ts` |
| Which weekday a date is (Monday-first) | `getWeekDay` | `booking.ts` |
| Does the provider have hours on this date | `isOpenOnDate` | `booking.ts` |
| Slot counts per day, for badges | `countSlotsByDay` | `booking.ts` |
| Month-grid cells, Monday-first | `buildMonthCells` | `calendar.ts` |
| Localised weekday column headers | `buildWeekdayLabels` | `calendar.ts` — **client-only** |
| Availability minus breaks | `splitScheduleIntoParts` | `schedule.ts` |
| Bookable windows → availability + breaks | `rangesToDaySchedule` | `schedule.ts` |
| Is the provider open at all this week? | `hasWeekScheduleHours` | `schedule.ts` |
| Minutes → `"1 h 30 min"` | `formatDuration` | `duration.ts` |
| Minutes → ISO `PT90M` (schema.org, `<time>`) | `toIsoDuration` | `duration.ts` |
| Merge Tailwind classes | `cn` | `cn.ts` |
| Absolute URL on the **site** origin | `absoluteUrl`, `getSiteUrl` | `url.ts` |
| Canonical URL of an entity's page | `generateEntityUrl` | `entities.ts` |
| Root-relative path of an entity's page (for `push`/`Link`) | `generateEntityPath` | `entities.ts` |
| Country + national number → `{ code, number }` | `toPhoneNumber` | `registration.ts` |
| `{ code, number }` / `+…` → country Select values | `toPhoneFormValues` | `registration.ts` |
| Organization combobox value → API fields | `toOrganizationFields` | `registration.ts` |
| Blank optional string → `undefined` | `toOptionalText` | `registration.ts` |
| Upload path → loadable URL | `resolveAssetUrl` | `images.ts` |
| …and never root-relative (JSON-LD, OG) | `resolveAbsoluteAssetUrl` | `images.ts` |
| Is this a real upload vs a bundled asset? | `isUploadedAsset` | `images.ts` |
| Avatar initials fallback | `getInitials` | `images.ts` |
| Escape JSON-LD for a `<script>` | `serializeJsonLd` | `jsonLd.ts` |
| Service worker script + offline document | `buildServiceWorkerScript`, `buildOfflineDocument` | `pwa.ts` |
| Google Maps link from an address | `generateGoogleMapsLink` | `location.ts` |
| Render a `{ code, number }` phone | `generateFriendlyPhoneNumber` | `phone.ts` |
| Accepted payment methods off a `paymentInfo` column | `toPaymentMethods` | `payment.ts` |
| Copyable card/account number and notes a provider publishes | `toPaymentShare`, `hasPaymentShare`, `acceptsBankTransfer`, `needsPublicShareConfirm` | `payment.ts` |
| ISO country code → name in the reader's language | `getCountryName` | `country.ts` |
| Language tags → phone-field country | `guessPhoneCountry` | `country.ts` |
| Pathname → route name (prefix match) | `matchRouteName`, `isRouteActive` | `routes.ts` |
| Normalize / flatten `{ allIds, byId }` | `flatToNormalized`, `normalizedToFlat` | `commons.ts` |
| Subset an object | `pick`, `omit` | `commons.ts` |
| Turn an unknown throw into an `AppError` | `processError` | `error.ts` |
| Check a password against the shared policy | `checkPasswordPolicy` | `password.ts` |

## Things to know before using them

- **`booking.ts` and `schedule.ts` both `dayjs.extend(customParseFormat)` at module
  scope.** It is mandatory: without it `dayjs('09:00', 'HH:mm')` is an Invalid Date and
  every schedule silently comes back empty. If you construct your own dayjs in a new
  module, extend it yourself.
- **`getSlotsForDate` / `getSlotsForDateRange` take an injectable `now`.** That is the
  only clock seam in the codebase — always pass it in tests.
- **Slots are `Date` objects anchored in local time** (`dayjs(date).startOf('day')`),
  while schedules are wall-clock `'HH:mm'` strings with no date and no zone.
- **`calendar.ts` shares the grid maths between the two calendars, not the markup.**
  `BookingMonth` (public booking) disables days with no open slots and refuses to page into
  the past; `ProviderBookingsCalendar` (booking history) does neither and badges each day
  with a count. One component covering both would be a props explosion; the cell
  arithmetic is identical and is the part that is easy to get subtly wrong.
  **`buildWeekdayLabels` reads `dayjs.locale()`, so it is client-only** — the locale is a
  module global and calling it on the server races two concurrent requests.
- **`images.ts` captures `API_ORIGIN` at module load.** It cannot be changed after import.
- **`url.ts` re-reads `process.env` per call**, so it is safe to stub at any point.
  In the browser `getSiteUrl` uses `window.location.origin` so share links stay
  on the host you are actually on.
- `errorMiddleware` (`store.ts`) is auth-only and does **not** catch rejections thrown
  inside async store actions.
- **`password.ts` mirrors `server/src/lib/password.ts#validatePassword` and must stay in
  step.** It returns a failure *reason* rather than a message, so the copy lives in the
  locale catalogues and `usePasswordRules` (`src/hooks/`) maps it. The server module cannot
  be imported from `tests/` — `@node-rs/argon2`'s `Algorithm` is an ambient const enum that
  `isolatedModules` refuses — so the cases in `tests/unit/helpers/password.spec.ts` mirror
  it rather than call it. **A partial mirror is worse than none:** the auth screens first
  checked only length, so a password the server rejected passed client validation and failed
  on submit with a message the form had never shown.
- **`pwa.ts` builds a network-only service worker.** Failed navigations get an inlined
  offline document; HTML pages and the API are never cached. A stale slot list is worse
  than an offline screen. Do not add a cache-first or stale-while-revalidate strategy
  there without a specific, non-booking asset in mind.
- **`payment.ts` is the only sanctioned reader of a `paymentInfo` column.** That column is
  opaque `Json?`, so several shapes reach the client: the current `{ methods, payToNumber?,
  notes? }`, leftover `{ cardNumber, accountNumber }` from the two-field shape, a leftover
  `{ reference }` from the original single-field shape, the pre-migration `{ method }` that
  a stale `Provider.draft` overlay can still carry, and `null`. `toPaymentMethods`
  normalises the method set and drops values outside the enum, which matters because the
  labels are looked up as `t()` keys — an unknown value would throw rather than degrade.
  `toPaymentShare` reads the copyable pay-to number, joining leftover split fields and
  treating `reference` as that number. It is public only when `bank_transfer` is selected
  (`acceptsBankTransfer`). `needsPublicShareConfirm` is true only when that number will go
  public *and* differs from the saved value (including newly ticking bank transfer with a
  number already filled), which is what gates the save dialog. `server/src/lib/payment.ts`
  is the methods twin; `server/` is a separate package with no import path into `src/`.

## Impure — treat differently

| Module | Why |
|---|---|
| `commons.ts#sleep` | Timer |
| `api.ts#getMockAsFakeAPI` | Unused one-line `Promise.resolve` |

## Dead code — do not extend

**Currently: none.** The three long-standing entries here were cleared on 2026-09-11 —
`src/constants/api.ts` (a byte-identical duplicate of `api.ts#paramsToQueryString`, which
now has real callers in `api/organizations/main.ts` and `api/appointments/main.ts`),
`urlSearchParams.ts`, and `booking.ts#getVisibleTimeRange` / `#groupSlotsByPartOfDay`.

The last two went with FullCalendar itself. They existed for the booking view the public
profile used to run — the first fed `slotMinTime`/`slotMaxTime`, the second sectioned the
slot sheet — and were kept on the theory that the unbuilt `provider_calendar_dashboard`
would want them back. That dashboard shipped in 2026-09-09 as a month grid over a list and
needed neither, so the theory expired and they went.

## Nearby, easily missed

- `src/constants/dates.ts#minsToDisplayFormat` renders the *same* value as
  `formatDuration` in a different style (`"1 hours, 30 minutes"`, no singular form). Two
  renderings of one concept in two directories — prefer `formatDuration`.
- `src/linkedDataSchema/` holds the JSON-LD builders; `jsonLd.ts` only serializes.

## Adding one

Pure function, named export, explicit param and return types, one concern per file. If it
touches time, take `now` as a parameter rather than calling `new Date()` internally — that
is what makes `booking.ts` testable. Add it to the table above, and add a spec under
`tests/unit/helpers/`.

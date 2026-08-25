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
| Calendar's visible hour window | `getVisibleTimeRange` | `booking.ts` |
| Group slots morning/afternoon/evening | `groupSlotsByPartOfDay` | `booking.ts` |
| Slot counts per day, for badges | `countSlotsByDay` | `booking.ts` |
| Availability minus breaks | `splitScheduleIntoParts` | `schedule.ts` |
| Is the provider open at all this week? | `hasWeekScheduleHours` | `schedule.ts` |
| Minutes → `"1 h 30 min"` | `formatDuration` | `duration.ts` |
| Minutes → ISO `PT90M` (schema.org, `<time>`) | `toIsoDuration` | `duration.ts` |
| Merge Tailwind classes | `cn` | `cn.ts` |
| Absolute URL on the **site** origin | `absoluteUrl`, `getSiteUrl` | `url.ts` |
| Canonical URL of an entity's page | `generateEntityUrl` | `entities.ts` |
| Upload path → loadable URL | `resolveAssetUrl` | `images.ts` |
| …and never root-relative (JSON-LD, OG) | `resolveAbsoluteAssetUrl` | `images.ts` |
| Is this a real upload vs a bundled asset? | `isUploadedAsset` | `images.ts` |
| Avatar initials fallback | `getInitials` | `images.ts` |
| Escape JSON-LD for a `<script>` | `serializeJsonLd` | `jsonLd.ts` |
| Google Maps link from an address | `generateGoogleMapsLink` | `location.ts` |
| Render a `{ code, number }` phone | `generateFriendlyPhoneNumber` | `phone.ts` |
| Pathname → route name (prefix match) | `matchRouteName`, `isRouteActive` | `routes.ts` |
| Normalize / flatten `{ allIds, byId }` | `flatToNormalized`, `normalizedToFlat` | `commons.ts` |
| Subset an object | `pick`, `omit` | `commons.ts` |
| Turn an unknown throw into an `AppError` | `processError` | `error.ts` |

## Things to know before using them

- **`booking.ts` and `schedule.ts` both `dayjs.extend(customParseFormat)` at module
  scope.** It is mandatory: without it `dayjs('09:00', 'HH:mm')` is an Invalid Date and
  every schedule silently comes back empty. If you construct your own dayjs in a new
  module, extend it yourself.
- **`getSlotsForDate` / `getSlotsForDateRange` take an injectable `now`.** That is the
  only clock seam in the codebase — always pass it in tests.
- **Slots are `Date` objects anchored in local time** (`dayjs(date).startOf('day')`),
  while schedules are wall-clock `'HH:mm'` strings with no date and no zone.
- **`images.ts` captures `API_ORIGIN` at module load.** It cannot be changed after import.
- **`url.ts` re-reads `process.env` per call**, so it is safe to stub at any point.
- `errorMiddleware` (`store.ts`) is auth-only and does **not** catch rejections thrown
  inside async store actions.

## Impure — treat differently

| Module | Why |
|---|---|
| `urlSearchParams.ts` | Reads `window.location`. Throws in Node. **Unused — delete it.** |
| `localStorage.ts` | Constants only, no logic. Actual reads/writes are inlined in `src/app/auth/**` and `hooks/useLocalStorage.ts` |
| `commons.ts#sleep` | Timer |
| `api.ts#getMockAsFakeAPI` | Unused one-line `Promise.resolve` |

## Dead code — do not extend

- **`src/constants/api.ts` is a byte-identical duplicate of `api.ts#paramsToQueryString`.**
  Neither is imported anywhere. Delete both rather than picking one.
- `urlSearchParams.ts` — both functions unreferenced, returns untyped.

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

# Bookings and Favorites — `/bookings`, `/favorites`, the heart

Design record for the two signed-in pages in the header. The rules that apply to every
route are in `src/app/CLAUDE.md`; read this before changing either page.

## `/bookings`

One page for the whole account, in the header beside Favorites, and **not** inside either
settings shell. It replaced the provider workspace's Bookings tab and the consumer
profile's Appointments tab, whose old routes are 307 Route Handlers
(`localeRedirect(ROUTES.bookings)`, pinned by `tests/unit/app/bookingsRedirects.spec.ts`).
`BookingsClient` picks the panel from the session:

| Session | Panel | Reads |
|---|---|---|
| consumer | `ConsumerAppointmentsClient` — search, status filter, sort; cancel, edit (manage link), write a review | `GET /appointments` |
| provider | `ProviderBookingsClient side='provider'` — month calendar as its own full-width row (with a show/hide control), filters, sort and the list below | `GET /provider-profile/bookings` + `/calendar` |
| provider whose account also holds a Consumer profile | the above, plus a `Segmented` "Booked with me / Booked by me" switch; the second is `side='consumer'` | `GET /provider-profile/consumer-bookings` + `/calendar` |

The page owns the one `PageHeader`; the panels render none. The switch shows only when
`GET /identity/me` reports `profiles.consumer`.

Beside the switch, on the provider side only, sits **Add from photo**
(`@components/bookingImport/PhotoImportButton` — see *Bookings a provider enters* in
`docs/DATABASE_STRUCTURE.md`). A finished import bumps `BookingsClient`'s `importRevision`,
which `ProviderBookingsClient` adds into the same `revision` its own status writes bump, so
the list and the calendar re-read without remounting.

### Six decisions worth not undoing

1. **Filter state is local component state, not the URL** — the opposite of Explore, and
   deliberately. These panels are client islands that fetch for themselves, so URL state
   would add a server round-trip to every filter change in exchange for a shareable link to
   a page only its owner can open. The view switch is local for the same reason.
2. **The calendar and the period chips write one range.** Selecting a day narrows the list
   to it; selecting it again clears. A chip (upcoming, this week, next week, last week, …)
   covers that span instead, and picking one clears the other. The list opens on
   **Upcoming**, oldest first; clearing filters returns to that, not to the whole history.
3. **`loading` is derived, never set at the top of an effect.** Each panel memoizes its
   request into an object that doubles as its identity and compares it against the last
   fulfilled one. `react-hooks/set-state-in-effect` is an ESLint **error** here.
4. **A provider's own bookings-as-client go through `side='consumer'`, not
   `ConsumerAppointmentsClient`.** `GET /appointments` scopes by the session's *role*, so a
   provider session is answered with the bookings made *with* them. The panel is keyed on
   `side`, so a switch starts the other view fresh.
5. **It is outside the settings shell, so it has no workspace switch.** `workspaceOf` does
   not claim `/bookings`, and `src/helpers/workspace.ts` has no `bookings` ↔ `appointments`
   pair.
6. **A pending row's kebab is empty**, and links to Approvals instead. Its two verbs send
   email; `PATCH /appointments/:id` does not, so confirming one from there would put it on
   the calendar in silence. The API refuses that write for the same reason.

## Favorites — `/favorites` and the heart

`/favorites` is a Server Component grid of `ProviderCard`s over `GET /favorites`, cookie
forwarded; a revoked cookie's 401 redirects to sign-in.

`FavoriteButton` (`@components/favorites`) sits in `EntityCard`'s `mediaAction` slot on
every `ProviderCard`. The card stays a Server Component and only the button hydrates.

- **The owner's own card has no heart.** `useFavoriteProvider` compares the card's id with
  the session's `profileId`. `PUT /favorites/:id` answers 403 regardless.
- **Guests see it too.** Their heart navigates to sign-in instead of toggling, and carries
  no `aria-pressed`.
- **Optimistic, and undone on failure.** `useFavoritesListStore.setFavorite` flips first and
  flips back if the write rejects; the button then raises `useErrorToast`.
- **The ids load once per session, however many hearts mount.** The effect in
  `useFavoriteProvider` reads the store's *live* `isPending` rather than the hook's
  snapshot. `loadedFor` is the `profileId` the ids belong to, so signing in as someone else
  in the same tab reloads them.
- **Un-favouriting on `/favorites` leaves the card in place** until the next visit.

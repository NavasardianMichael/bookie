# One full name — 2026-10-20

## Before

Every person's name was a pair: `Provider.firstName` + `lastName`, `Consumer.firstName` +
`lastName`, and a guest booking's `Appointment.guestFirstName` + `guestLastName`. Every form
asked for both (40 characters each), Google sign-up split its profile into the two halves,
and the code assumed "given family" order wherever it showed a name — greetings used the
first half, sorting used the last.

## After

- **One field, as written.** `Provider.fullName` and `Consumer.fullName` (NOT NULL) and
  `Appointment.guestFullName` (nullable). No given/family split in the schema, the API, the
  stores or the forms. Many names are not "given family" — family-first orders, single names,
  several family names — and people think of their name as one thing, not two fields.
- **The migration joined the pairs** (`20261020000000_full_name`): each part trimmed, an empty
  part skipped, so a Google sign-up stored as `'Anna' + ''` became `Anna`, not `Anna `. The
  unpublished `Provider.draft` overlays were rewritten to the `fullName` key too, so a pending
  name edit survives Publish. `appointment_actor_present` was dropped and re-added as
  `consumerId IS NOT NULL OR (guestFullName IS NOT NULL AND guestPhoneNumber IS NOT NULL)`;
  `[listed, lastName, firstName]` became `[listed, fullName]`.
- **Capped at 100.** `asFullName` (`server/src/lib/request.ts`) collapses whitespace runs,
  trims, and caps at `MAX_FULL_NAME_LENGTH`; the forms use the `maxCharsForName` rule
  (`MAX_CHARS_FOR_NAME`, `Validation.maxCharsForName`). Roomier than the old 40 per half: the
  joined legacy names reach 81.
- **Greetings use the full name** — `Hi Anna Petrosyan,` — since there is no first name to pick
  out (`bookerGreetingName` / `providerGreetingName` in `lib/booking-notices.ts`).
- **A review's author is `Anna P.`** — the first word and the last word's initial
  (`reviewAuthorName`). Middle words are dropped, a one-word name stays whole.
- **Google's display name is preferred** for the sign-up prefill, then given + family joined,
  then the email's local part (`fullNameOf`, `lib/google-oauth.ts`).
- **The contact form sends `fullName`**; the mail engine's request still names its field
  `firstName`, so the whole name rides in it and `lastName` is left out (`routes/contact.ts`).
- **Search and sort read the one column**: Explore, the provider's bookings search (consumer
  name or guest name), and `nameAsc` everywhere.
- **Labels**: the eight `firstName` / `lastName` keys in `Auth.fields`, `Booking.guest`,
  `Contact.fields` and `Settings.profile` became one `fullName` key each, in all 16 catalogues.

## Still to do

`readPending` in `server/src/routes/identity-google.ts` joins a `firstName` / `lastName` pair
from a pending-sign-up cookie signed before the deploy. That cookie lives
`oauthPendingTtlMs` (15 minutes), so the fallback can be removed once the deploy is older
than that.

Where it lives now: *Names* in `docs/DATABASE_STRUCTURE.md`, `server/src/lib/request.ts`,
`tests/unit/server/request.spec.ts` and `googleOauth.spec.ts`.

# Account settings — `/providers/profile/*`, `/consumers/profile/*`

Design record for the two settings shells. The rules that apply to every route, and the
tab table, are in `src/app/CLAUDE.md`; read this before changing a tab or the shell.

## What lives where

Each sidebar tab is a nested route so Next lazy-loads the panel. The route group
`providers/(account)` also wraps `profile-services`.

- The provider **Profile** tab holds, besides the form: phone change (Personal Information);
  the **organization** — registration's `OrganizationSection`, optional here, Detach shown
  only while one is linked, saved **live** through `PATCH /provider-profile/organization`
  by either Save draft or Publish; the **categories** — `CategoriesSection` (up to 3),
  saved live through `PUT /provider-profile/categories`; and the listing controls (copy URL,
  share, publish/unpublish) on the tab's hero.
- **Delete account** sits at the end of both Profile tabs (`DELETE /identity/account`,
  password reauth). It is not the listing trash icon, which only removes the public page.
- Consumer phone and preferred payment methods live in the consumer Profile tab; the old
  `/consumers/profile/phone` and `/consumers/profile/payments` routes 307 to Profile.
- Visual language follows the prototypes, with these deviations matching registration:
  global Header/Footer, no dark mode, no password/2FA/security, **no autosave** (Discard /
  Save, plus Save draft / Publish for providers).
- Providers may publish their own card or account number on the public page after a save
  dialog confirming those details will be public; the app never collects a *client's* card.
- Provider `listed` hides Explore + public 404; `available` only pauses bookings — the API
  refuses them and the public page shows the closed notice.

The services page and the Analytics and SEO tabs gate on `personal.entitlements` from the
owner profile they already load — no extra request. Each control the plan does not allow
is disabled with a line linking to the Plan tab; the API refuses the same write regardless.

## Services: when each one is offered

The service form ends with an **Availability** section, the same vocabulary as the
Availability tab: *Always*, *Recurring* (Weekdays, or Days of the month — the 1–31 chips, a
*Last day* chip) or *Specific days*. Then *Only at certain hours* — one set, or under Weekdays **each ticked day
its own** (`hoursByDay`) — and the service's own **Added dates** and **Excluded dates**
(`availability.exceptions`, the Availability tab's dates editor reused through
`ServiceExceptionsField`): an added date is offered on the provider's hours that day or only
some of them; an excluded one not at all, or not during some hours. Under *Specific days*, an
added date with hours is how one date gets hours of its own. Available on every plan. The rule
itself is in `docs/DATABASE_STRUCTURE.md` → *Which days a service is offered on*; the decisions
behind it:

- **A service narrows the provider's hours, never widens them.** Its days, hours and dates are
  always cut to the provider's own, so the Availability tab stays the one outer frame. The
  Weekdays cards show each day's provider hours read-only; a day the provider is closed can
  still be ticked (and a closed date picked) — saving then asks whether to open it, fit the
  service, or save as it is (`ServiceConflictSheet`, *Special dates and service hours* in
  `docs/routes/ai-assistant.md`).
- **Narrowed on read, not clamped on save.** Changing the provider's hours later changes
  every service at once, with no stored rule left pointing at hours that no longer exist.
  The form warns when a pick can never be booked but still saves it, since it fixes itself
  when the provider opens those days.
- **A missing month day is skipped, and neither form asks.** "Every 31st" that quietly became
  "April 30th" would book a day the provider never chose; someone who means the end of the
  month ticks *Last day*. An *In shorter months, use the last day* switch used to offer the
  move (`shortMonths: 'last'`) and was removed: 31 with it on *is* Last day, and its one other
  reading — "the 30th, or the month's end when shorter" — is a billing rule, not opening hours.
  The API still accepts and honours `shortMonths`, so a rule saved with it keeps working until
  its form is saved again, which drops it (the Availability tab's publish dialog lists that as a
  change of rule).
- **The form keeps every mode's pick** while it is open, so trying Weekdays and going back
  to Always loses nothing; only the active mode is sent. Switching an *Always* service to
  Weekdays starts with the provider's open weekdays ticked, and every day's own hours start
  from the shared set.
- **An edit is an update.** antd's `onFinish` carries registered fields only and the service id
  is none, so `ProviderServiceForm` puts the id it was opened with back on the submit; without
  it every edit was a create and duplicated the service.
- **Photo import is held to it too.** A row on a day its service is not offered on is
  flagged (`serviceClosed`) and cannot be saved until it is moved, and the API refuses it
  (`4203`) like a visitor's booking.

## Two of the provider tabs are not settings

`Approvals` and `Analytics` are for running the business rather than configuring it. They
share the shell because a second nav and shell would be two mental models for one
workspace. `PROVIDER_SETTINGS_NAV` keeps Approvals first after Profile (its queue goes
stale) and puts Analytics near the end.

Three decisions worth not undoing:

1. **SEO saves live; it does not use the draft overlay.** The draft model exists so a
   provider can rework the *visible* page without it going out half-finished, and a title
   tag has no half-finished state. See `docs/DATABASE_STRUCTURE.md`.
2. **Approvals is its own tab, not a filter on Bookings** — even though it reads the same
   endpoint with `status=pending`. Bookings is a record to scan, with its verbs behind a
   kebab; Approvals asks one question per row and puts both answers on the surface, with
   every detail the decision rests on rendered. No filters, no search, no calendar on
   purpose. The setting lives on the same screen because a switch is unintelligible away
   from what it produces — an empty queue otherwise cannot be told apart from a switch
   that is off.
3. **Analytics is not filtered with Bookings.** Charts stay on Analytics with the range
   control; the list on `/bookings` is not filtered by that range.

## One account, two workspaces

`AccountSettingsLayout` renders a **workspace switch above the panel on every settings
subpage**, moving between `/providers/profile/*` and `/consumers/profile/*`. One `User` can
hold both profiles — booking anyone creates the Consumer row (`resolveConsumerId`) — while
the session carries a single role, resolved provider-first at login.

- **It navigates; it does not re-authenticate.** No cookie is reissued.
  `consumerProfileRouter` resolves the row from `session.userId`, not the session's role
  (see `server/CLAUDE.md`).
- **It renders only when the account holds both profiles**, from `profiles` on
  `GET /identity/me`. Otherwise, while `profiles.provider === false`,
  `BecomeProviderPrompt` sits in its place.
- **The destination comes from a table**, `src/helpers/workspace.ts`, not from rewriting
  the path — the two sides have different tabs. A tab with no counterpart falls back to the
  other side's home. Pinned by `tests/unit/helpers/workspace.spec.ts`.
- **The layout guard asks whether the account holds *this* side**, not whether the
  session's role matches it. A payload without `profiles` falls back to the old, narrower
  rule.
- **The AI assistant is not part of the layout** — it floats in the page corner on every page
  (`AssistantLauncher` in `App.tsx`). The provider layout only listens: after an apply it re-keys
  the open tab on `useAssistantPanelStore.revision`, so the tab reads its data again, and
  re-counts the Approvals badge. See [ai-assistant.md](ai-assistant.md).
- **Availability is a rule plus dates**, all saved together as one draft. **Your hours** picks the
  rule (`ProviderScheduleRuleFields`): *Recurring* on weekdays (each with its own windows) or on
  days of the month (1–31 and *Last day*, one set of hours), or *Specific days* — then **Open dates** are the only open days. Under a
  recurring rule, **Added dates** (their own hours, replacing the usual ones) and **Excluded dates**
  (all day, or some hours) sit below. All three date sections are one `specialDates` list
  (open / closed entries) that never overlaps; the weekly rows stay in the form under every rule,
  as `weekSchedule` stays in the database, so switching back loses nothing. Publish first checks
  what the new hours do to services and upcoming bookings (`ScheduleImpactModal`) — nothing is
  cancelled. The dialog names the exact change being approved, not a summary: each weekday's
  hours before → after, a change of rule, each special date added / changed / removed
  (`hoursChanges`), and for every service that loses times, which ones — "Wednesday, every week ·
  12:00–17:00", or a date (`serviceLosses`). The assistant's Apply opens the same dialog. **Advanced settings** carries the visitor-assistant switch, which saves on
  its own.

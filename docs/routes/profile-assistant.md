# The profile assistant

The magic button (⚡) beside the workspace switch on every provider settings tab. A provider
describes their business in their own words, in any language — services, prices, hours, how
clients pay — and Gemini drafts their whole workspace from it. They review it tab by tab and
approve; nothing is saved before that.

Wire contract, refusals and the transaction: *The profile assistant* in
[DATABASE_STRUCTURE.md](../DATABASE_STRUCTURE.md). Plan metering: [BILLING.md](../BILLING.md).

## Where it lives

| Piece | File |
|---|---|
| Prompt, schema, narrowing, apply validation, service diff (pure) | `server/src/services/profileAssistant.ts` |
| Routes, the transaction | `server/src/routes/profileAssistant.ts` |
| The one Gemini client, its error mapping | `server/src/lib/gemini.ts`, `gemini-errors.ts` |
| API module | `src/api/profileAssistant/` |
| Diff and form ↔ proposal (pure) | `src/helpers/profileAssistant.ts` |
| Button, sheet, review, one component per step | `src/components/profileAssistant/` |
| Mounted (status read, auto-open, re-mount after apply) | `src/app/[lang]/providers/(account)/ProviderSettingsLayoutClient.tsx` |

## Decisions

**The answer is the whole desired state, not a patch.** "I now offer only one service, on
Mondays 18:00–21:00" has to remove every other service and close every other day; a patch
format has no way to say "and nothing else". So the model gets the current workspace and
returns all of it. The cost is that it must repeat what it keeps — so an empty field keeps the
current value, and only *leaving a service out* removes it.

**Removing a booked service switches it off.** `Appointment.serviceId` has no `onDelete`, and
the Services tab's own delete answers `409` for a service with history. The assistant deletes
a never-booked service and deactivates a booked one, so the review's "Removed" is always
possible to apply.

**One transaction, published.** The tabs save separately — Profile alone makes up to six calls
— so applying through them would leave a half-written workspace on any failure. The apply is
one request and one transaction, and it publishes: the draft keys it writes are dropped from
`Provider.draft`, so a stale tab draft cannot overwrite them later. `listed` is not touched —
a new page still goes public only on "Publish page", after the provider has seen it.

**What is never drafted:** the pay-to card or account number (never invent one; it is kept as
saved), phone, email, photos, Telegram and the calendar feed (they need linking), the
Approvals queue (only its switch), Analytics and Payouts (read-only), and the slug on a plan
without `customSlug`.

**Free gets one draft a day, like photo import.** Every draft spends the deployment's one
shared Gemini key; failed calls give the allowance back. Applying is free. The plan's service
cap refuses only *growth* past it, so a downgraded provider above it can still use the
assistant to trim.

**It opens by itself once.** `Provider.assistantSeenAt` is null for a new account, so the
provider layout opens the sheet on their first visit — whatever tab they land on (today
Availability, via `newAccountLandingPath`). Closing it or applying stamps the column. Not on
the session: a password sign-in takes its session from `/identity/login`, which never reads
`/me`, so the layout reads `GET /provider-profile/assistant` once instead. The migration
stamped every existing provider, so the popup never ambushes someone with a live page.

**The prompt limit is 2,000 characters.** Gemini's input limit is not the constraint — the
answer's time and quality are. 2,000 fits about ten services with prices and hours; the
schema's `maxItems` (30 services, 5 ranges a day) bounds the answer.

## The review

Nine steps in an `AppSheet`: the eight settings tabs the assistant drafts, named exactly as
in the sidebar, then a summary. Each step is marked *Changed* or *No changes* against the
current workspace (`changedSteps`), and every service as *New*, *Changed*, *Unchanged* or
*Removed*, with Restore until Approve.

- **One antd `Form` for every step, with `component={false}`.** It keeps off-screen steps'
  values, so an edit survives moving between steps. No `<form>` element of its own, because
  the Services step opens the Services tab's own `ProviderServiceForm` inside it (photo field
  off), and forms may not nest. Services live beside the form in state.
- **The steps reuse the tabs' own fields** — `AvailabilityDayRow`, `CategoriesSection`,
  `PaymentMethodPicker`, `AppointmentReminderPref`, `ProviderProfileTimeZone`,
  `TimeFormatToggle`, the SEO caps from `@helpers/providerSeo` — so the assistant cannot accept
  what the tab would refuse.
- **Closing mid-review asks first** (`AppConfirmModal`), and the unsaved-changes guard is armed
  while the review is open.
- A taken slug on Approve jumps back to the SEO step.

## Known gaps

Tracked in [BACKLOG.md](../BACKLOG.md): the review does not warn about upcoming bookings that
fall outside drafted hours, and the daily allowance is the UTC day.

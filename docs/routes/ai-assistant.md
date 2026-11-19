# The AI assistants

Two chats on Google Gemini, streamed as they are written:

- **The provider's assistant** — a round chat button in the bottom end corner of **every page**
  a signed-in provider opens, as chat widgets sit. It answers questions about the provider's own
  workspace and **proposes** changes to it; nothing changes until the provider presses Apply on
  the card. Standard and Premium (other plans see what unlocks it).
- **The visitor assistant** — **Ask a question** on a provider's public page. It answers a
  visitor's questions about that provider and changes nothing. Premium, switched on by the
  provider (Advanced settings).

It replaced the one-shot "profile assistant" (2026-10-25 → 2026-11-17), which drafted a whole
workspace from one description. A chat that proposes one change at a time covers both the first
setup and the day-to-day ("closed tomorrow").

Wire contract and tables: *The AI assistants* in [DATABASE_STRUCTURE.md](../DATABASE_STRUCTURE.md).
Plan metering: [BILLING.md](../BILLING.md). The schedule the assistant edits — special dates and
service hours — is *Special dates and service hours* below.

## Where it lives

| Piece | File |
|---|---|
| The one Gemini client: `generateJson` (photo import), `streamChat` (both assistants) | `server/src/lib/gemini.ts`, `gemini-errors.ts` |
| Server-sent events, the only writer | `server/src/lib/sse.ts` |
| Provider assistant: prompt, `propose_changes` function, narrowing, history replay (pure) | `server/src/services/assistant.ts` |
| Provider assistant routes | `server/src/routes/assistant.ts` (`/provider-profile/assistant`) |
| Visitor assistant: free time, facts, prompt, turn parsing (pure) | `server/src/services/visitorAssistant.ts` |
| Visitor assistant route | `server/src/routes/visitorAssistant.ts` (`POST /providers/:id/assistant`) |
| Live schedule writes, provider reschedule | `server/src/routes/providerSchedule.ts`, `services/scheduleWrites.ts` (pure) |
| API module (axios + one `fetch` for the streams) | `src/api/assistant/`; reader `src/helpers/sse.ts` |
| Chat state, apply | `src/hooks/useAssistantChat.ts`, `useApplyAssistantProposal.ts`, `useVisitorAssistantChat.ts` |
| Pure rules: route per change, schedule batching, status | `src/helpers/assistant.ts` |
| Launcher, panel, cards, composer | `src/components/assistant/`; open state + "applied" signal `src/store/assistant/panel/` |
| Public page button + sheet | `src/components/visitorAssistant/` |
| The visitor switch | `src/components/settings/VisitorAssistantSetting.tsx` (Advanced tab) |

## Decisions

**A floating launcher, not a settings-tab button.** `AssistantLauncher` is mounted once in
`App.tsx` and shown to any signed-in provider, so "closed tomorrow" can be said from the bookings
list or the public page as easily as from Availability. The panel is **non-modal** — the page
behind stays usable, so a provider can read their hours while asking to change them — and fills
the screen below `md`, where its header closes it and the button steps aside. On desktop its
header's **Expand** docks it along the bottom of the page, edge to edge but for the gutters and
up to the site header (the conversation held to a readable column), for a long thread or a big
proposal — the button hides meanwhile, since the panel covers its spot, so `expanded` lives in the
panel store beside `open`; **Shrink** puts it back in the corner. It is loaded on the
first open (`next/dynamic`) and stays mounted afterwards, hidden, so a reply still streaming and a
half-typed message survive closing it. Escape closes it while focus is inside; focus returns to
the button.

**Several chats.** A provider's history is a list of chats (`AssistantConversation`), not one
thread: "closed tomorrow" this week and "add a beard trim" last month are separate, and each
sends Gemini only its own last 20 turns, so an old topic never leaks into a new answer. The panel
opens the newest; the list button (the side column when expanded) switches; **New chat** opens an
empty one, which exists only once its first message is stored — a message that fails takes its
new chat with it. A chat is titled from its first message (`conversationTitle`, 60 characters at
a word); one a diary photo started without a note has no title and the client calls it *Diary
photo*. The bin deletes the open chat. Up to 50 chats are kept, 200 messages each. The daily
allowance is shared by all of them. Existing history became one chat per provider in migration
`20261118000000_assistant_conversations`.

After an apply, the launcher bumps `useAssistantPanelStore.revision`, re-reads the session and
calls `router.refresh()`. The provider settings layout re-keys its open tab on the revision (and
re-counts the Approvals badge), and the bookings list re-reads — the pages that show what the
assistant can change. `SettingsActionBar` stops `me-16` short of the corner while the button is
shown, so Save is never under it.

**The server never applies anything the model said.** The model has one function,
`propose_changes`; what it proposes is narrowed (`narrowAction`: known service and booking ids,
dates not in the past, times that parse, what the plan allows) and **stored as data** on the
reply. The provider's browser applies it on Apply, through the very requests the settings tabs
make (`useApplyAssistantProposal`), so every validation, plan gate and client email those routes
have holds, and the assistant can do nothing the provider could not do by hand. Then the browser
reports what happened (`PATCH …/messages/:id`), so the chat reopens on the truth and the model is
told on the next turn.

**The card is built from the actions, never from the model's prose.** `useAssistantActionLines`
words each structured action ("Every Tuesday: 10:00–14:00", "Cancel Mia's Cut, Fri 3 Mar,
10:00"), so what the card says is exactly what Apply sends. Booking and service actions carry a
display snapshot the server copies from the context — the apply addresses them by id.

**Adjust myself is a link, not a prefilled form.** Each group of changes on a card links to the
settings page where the provider makes that change by hand. Prefilling those pages would need
a second, unsaved state on every tab; a link keeps the tabs as they are.

**Schedule changes publish at once.** A proposal's hours, special dates, pause switch and clock
go out as one `PATCH /provider-profile/schedule` (`toSchedulePatch`) — live, because that is
what the provider just approved. An unpublished Availability draft gets **the same change merged
onto its own copy**, so its other edits survive and the next Publish cannot undo the change.

**Everything else is one request per change, each failure its own.** All made → `applied`;
some → `partial`, with ✕ beside what did not go through; none → the proposal stays pending to
try again. A schedule change is one request, so its lines succeed or fail together.

**What the assistant can propose.** Weekly hours, special dates, pausing online booking,
services (create, edit, turn on/off, delete — a booked service is turned off instead, since a
delete would `409`), profile text, categories, the approval switch, notification preferences,
the time zone and 12/24-hour clock, SEO title/description/slug, publishing the page, the
visitor assistant, and bookings: approve/decline a pending one, cancel, reschedule. Cancelling
and rescheduling email the client; the card says so before Apply. Rescheduling is
`PATCH /provider-profile/bookings/:id/reschedule`, the client's own reschedule rules with the
provider as the actor (the client is told; the provider is not).

**What it cannot, by design.** Payment card or account numbers (an invented or mistyped digit is
someone's money), phone and email (they need verification), photos, plan and billing, password,
deleting the account. The prompt names the page instead. The time zone and the slug are allowed
with a warning on the card — they move every published hour and break shared links.

**History replays as text.** Past proposals go back to the model as `[Proposal: … Status: …]`
inside the model's turn, not as function calls: a replayed function call must carry the
model's thought signature on Gemini 3, which we do not keep. The open chat's last 20 turns are
sent; 200 are kept per chat; deleting the chat deletes them.

**The workspace goes in the system instruction, fresh each turn.** Hours, special dates,
services with ids, settings, plan limits, pending bookings and the next 30 days' (at most 60) —
each booking with the client's **name only**, no phone or email, which is what a provider says
to point at one. Today's date, weekday and the next week's dates are spelled out, so "tomorrow"
and "next Friday" need no calendar arithmetic from the model.

**Photo import is the same feature.** The camera button reads the photo through
`POST /provider-profile/bookings/import/parse` (the photo allowance, the throttle, nothing
stored), then posts the rows into the chat (`POST …/photo`, re-narrowed there). *Review and add*
opens the same review as *Import from photo* on `/bookings`.

**The visitor assistant is read-only by construction.** No function, only facts: services with
their days and hours, weekly hours, special dates (60 days), free time for the next 14 days
(hours minus busy *instants* — no id, name or service of another client, the data the public
grid already shows), what each service can fit in it, address, contact, payment methods,
rating, and whether booking is open (`paused`/`full` without saying why). The browser keeps the
conversation in **localStorage**, one per provider page, so a visitor who comes back finds it;
it expires 30 days after its last answer (a shared computer should not keep it for good) and
**Start over** removes it. It sends the last 12 turns back; nothing of it is stored on our side.

**Streams, and their errors.** Both chats answer as server-sent events (`lib/sse.ts`): `text`
deltas, then `done` (or `start` first, for the provider). Every refusal known up front —
validation, plan, allowance, rate limit — is thrown **before** the stream opens, so it arrives as
an ordinary envelope with its status. After that, a failure is an `error` event carrying the
same envelope plus the status. The browser turns either into an `AxiosError`
(`helpers/sse.ts#toStreamError`), so the error copy by code, Retry and the development details
work unchanged. nginx buffering is off per response (`X-Accel-Buffering: no`).

## Limits

| | Free | Basic | Standard | Premium |
|---|---|---|---|---|
| Provider assistant messages / UTC day (`assistantMessagesPerDay`) | — | — | 40 | 150 |
| Visitor questions / UTC day, all visitors (`visitorAssistantMessagesPerDay`) | — | — | — | 300 |

- **Per message:** 1,000 characters (provider), 500 (visitor). The composer counts down.
- **Brakes on the shared key**, every plan, in-memory: 30 provider messages per 10 minutes per
  provider; 20 visitor questions per hour per IP.
- **Metered in `AssistantUsage`**, one counter row per provider, assistant and UTC day, spent by
  a conditional increment before the call (two messages sent together cannot both pass) and
  given back when no answer came. Not a count of the history: clearing the chat refills nothing,
  and visitor turns are not stored.
- **A visitor never hears about a plan.** Off, unlisted, or a lapsed plan → `404`
  `visitorAssistantOff`; the day's questions spent → `429` `visitorAssistantBusy` with
  `Retry-After` to UTC midnight, worded "contact the provider". The public payload's
  `details.visitorAssistant` is plan-neutral, like `showPoweredBy`.

## Special dates and service hours

The assistant's first example — "closed tomorrow, until 22:00 the day after" — needed a schedule
that can say it, so the schedule grew two things in the same change:

- **Special dates** (`Provider.specialDates`): a day or a run of days that is closed or open on
  hours of its own, with an optional note visitors see. They win over the weekly hours, never
  overlap, and are drafted with the week on the Availability tab. The public page lists the next
  30 days' under the hours.
- **Service hours** (`availability.hours`, or per weekday `hoursByDay`) and **service dates**
  (`availability.exceptions`, added or excluded, whole day or some hours): a service may keep to
  part of the day, or its own dates. It still **narrows only** — bookable where its days and
  hours meet the provider's.

**Where they meet, the provider is told — never surprised.**

- **Saving a service** that reaches outside the published hours (a closed day it is offered on,
  hours past the provider's) opens `ServiceConflictSheet` with three choices, each previewing
  exactly what it changes: *Widen my hours* (opens or stretches those weekdays, published at
  once; special dates are never touched — a holiday stays a holiday), *Fit the service* (drops
  the days and hours it cannot have; `null`, so not offered, when nothing would be left), or
  *Save as it is*. An inactive service is saved without asking. The pickers let a closed day be
  chosen (struck through, marked closed) precisely so this choice can be offered.
- **The service card** keeps saying "Not bookable on N of its days — outside your hours".
- **Publishing the Availability tab** checks what it does first (`scheduleImpact`): every change
  being approved (each weekday's hours before → after, a change of rule, each special date
  added / changed / removed — `hoursChanges`), services that could be booked and no longer can,
  services that lose times — and exactly which ("Wednesday, every week · 12:00–17:00", a date —
  `serviceLosses`) — and upcoming bookings (next 90 days, every page of them) left outside the
  hours. Nothing is cancelled; *Publish anyway* or *Keep editing*, with a link to `/bookings`.
- **Applying an assistant proposal** that changes hours or special dates runs the same check
  first (`useAssistantScheduleImpact`: the live hours, `hoursAfterSchedulePatch`, then
  `scheduleImpact`) and shows the same dialog as *Apply anyway* / *Not now*. Nothing is asked
  when nothing is affected. Both sides are read on the provider's current clock: a proposal that
  also moves the time zone already carries its own warning on the card.

## Known gaps

Tracked in [BACKLOG.md](../BACKLOG.md): the assistant's daily window is the UTC day; the brakes
are in-process.

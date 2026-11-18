# The AI assistant as a chat, and a schedule that can say "closed tomorrow" — 2026-11-17

## Before

- **The profile assistant** (2026-10-25): a ⚡ button on provider settings. A provider described
  their business once; Gemini drafted the whole workspace as one proposal, reviewed tab by tab in
  a nine-step sheet and applied in one server transaction. Free got one draft a day. It opened by
  itself for new accounts (`Provider.assistantSeenAt`), and every draft was metered in
  `ProfileAssistantRun`.
- **A weekly schedule only.** `Provider.weekSchedule` could not say "closed on the 25th" or
  "open late this Friday".
- **Services picked days, never hours**, and a service set to a day the provider was closed was
  silently unbookable.

## After

- **Two chats, streamed** (`streamGenerateContent?alt=sse` through `lib/gemini.ts#streamChat`,
  events written by `lib/sse.ts`): the provider's assistant (Standard 40 / Premium 150 messages a
  day) and the public page's visitor assistant (Premium, 300 questions a day, switched on in
  Advanced settings). Metered in `AssistantUsage`; the provider's history in `AssistantMessage`.
- **Proposals, never server writes.** The model calls `propose_changes`; the server narrows and
  stores it; the browser applies it on Apply through the settings tabs' own requests and reports
  the outcome. Cards are worded from the structured actions, with **Adjust myself** links.
- **Bookings in the chat**: approve, decline, cancel, and reschedule — the last through a new
  `PATCH /provider-profile/bookings/:id/reschedule`. The photo import moved into the chat as well
  (camera button), and stays on `/bookings` as **Import from photo** (now outlined, under the view
  switch).
- **Special dates** (`Provider.specialDates`) and **service hours** (`availability.hours`),
  followed by the booking grid, the booking check, the card's *open today*, Explore's *open
  today* filter (one raw query for the rows a special date settles today) and the public hours.
  A live `PATCH /provider-profile/schedule` merges a change into any unpublished draft too.
- **No silent conflicts**: the service sheet asks when a service reaches outside the hours (widen,
  fit, or save as it is — each previewed), the service card keeps a warning, and both the
  Availability tab's Publish and the assistant's Apply say which services and upcoming bookings
  the new hours would leave out (every booking in the next 90 days, all pages).
- **Several chats per provider** (`AssistantConversation`, migration
  `20261118000000_assistant_conversations`): a list, New chat, delete one; each chat replays only
  its own turns to Gemini.
- **Durations in the reader's language**: `formatDuration(minutes, locale)` now words its units
  from CLDR (`Intl.NumberFormat` + `Intl.ListFormat`) instead of a fixed English "1 h 30 min".

## Removed

`server/src/services/profileAssistant.ts`, `routes/profileAssistant.ts`,
`src/components/profileAssistant/`, `src/api/profileAssistant/`, `src/helpers/profileAssistant.ts`,
`src/constants/profileAssistant.ts`, their specs, `docs/routes/profile-assistant.md`, the
`Settings.assistant` copy, `ProfileAssistantRun`, `Provider.assistantSeenAt` and the
`profileAssistantRunsPerDay` entitlement (migration `20261117000000_assistant_chat`). Code `4105`
now means `assistantLimit`.

Design record: [docs/routes/ai-assistant.md](../routes/ai-assistant.md).

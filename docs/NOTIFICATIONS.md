# Notifications — email, Telegram and the reminder job

Bookie tells people about bookings by **email and Telegram, and nothing else** — there is no
SMS (docs/BILLING.md says why). Email reaches everyone with an address; Telegram reaches
whoever connected it on their Notifications tab.

## Who decides what goes where

`server/src/services/noticeRules.ts#channelsFor` — pure, unit-tested — is the one place that
picks channels. `services/notify.ts#deliver` sends; `services/bookingNotify.ts` loads a
booking's two sides once per event and calls it.

| Recipient | Email | Telegram |
|---|---|---|
| Provider | always, to their account address | when linked **and** their plan has `telegramNotifications` (Basic and up) |
| Signed-in client | always | when linked — never gated by anyone's plan, because clients never pay |
| Guest (booked without an account) | when they gave an address | never — there is no account to link |

A preference silences an event on **both** channels. The preferences are the existing
`emailNotificationPrefs` JSON on each profile (`lib/notification-prefs.ts`); the column kept
its name.

| Event | To | Silenced by | Sent from |
|---|---|---|---|
| Booking confirmed / request received | booker | — (it is their receipt) | `POST /appointments` (email: `booking-mail.ts`; Telegram: `bookingNotify`) |
| **New booking** | provider | `newBooking` | `POST /appointments`, when no approval is needed |
| Approval request | provider | — never: nothing happens until it is acted on | `POST /appointments`, when approval is on |
| Approved / declined | booker | — it answers their request | `PATCH /provider-profile/bookings/:id/decision` |
| Rescheduled | the other side | `bookingChanges` (a guest always gets it) | `PATCH /appointments/manage/:token` |
| **Cancelled** | the other side | `bookingChanges` | `PATCH /appointments/manage/:token`, `PATCH /appointments/:id` |
| **Reminder** | each side, at its own lead time | `appointmentReminders` | the reminder job |
| Allowance 80% / 100% | provider | — the only signal | `services/planNotices.ts` (email only) |

Every notice is **best-effort**: the booking it describes is already committed, so a failed
send is logged and never fails the request. Each message is written once as a channel-neutral
`Notice` (`lib/booking-notices.ts`) and rendered per channel (`lib/notice-render.ts`), every
user-written string escaped on the way out.

**Copy is English** and times are in the provider's time zone, on their 12/24-hour clock
(`lib/time-format.ts#formatBookingWhen`), like
every email the API sends — neither profile stores a language yet (`docs/BACKLOG.md`).

## The reminder job

`server/src/jobs/reminderJob.ts` is **the API's one background job**. Everything else is
computed on read — plan expiry still is — but a reminder has to happen at a time when nobody
is making a request.

- Started by `index.ts`, never by `createApp`, so tests and scripts never poll.
  `REMINDERS_ENABLED=false` turns it off.
- Every minute it reads `scheduled`/`confirmed` bookings starting within the next 24 hours
  (the longest lead time anyone can pick) that have a side not yet reminded
  (`@@index([status, startAt])`).
- For each side that is due (`services/reminders.ts#isReminderDue`), it **claims the send by
  compare-and-set** on `providerRemindedAt` / `bookerRemindedAt`, then sends. A reminder
  therefore goes at most once, even with two pollers; one that fails after its claim is not
  retried — a late duplicate is worse than one missed reminder.
- A booking made inside its own reminder window is never reminded, and neither is a side
  whose reminders are off. Both are stamped without a send, so the sweep only re-reads what
  is still to come — which also means turning reminders back on applies to bookings the job
  has not yet looked at. A reschedule clears both stamps
  (`services/appointments.ts#rescheduleAppointment`), so the new time is reminded of.
- Lead time: each side's `appointmentReminderMinutes` (15 min, 1 h, 6 h, 24 h); a guest gets
  24 hours.

## Telegram

One bot, one linked chat per **account** (`User.telegramChatId`), shared by both workspaces.

**Linking is done in Telegram, never by typing an id.** *Connect Telegram* calls
`POST /telegram/link`, which stores a hashed one-time token (15 minutes) and answers
`https://t.me/<bot>?start=<token>`. Opening it and pressing Start sends the bot
`/start <token>`; the webhook links that chat to the token's account and replies. Only the
chat that pressed Start is ever linked, so nobody can attach someone else's. `/stop` in the
chat, or *Disconnect* on the tab, unlinks it; so does the bot being blocked (Telegram answers
403 and `notify.ts` drops the link).

### Setting the bot up

1. In Telegram, ask **@BotFather** for `/newbot`. Note the token and the username.
2. API env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (without `@`), and
   `TELEGRAM_WEBHOOK_SECRET` — any long random string (`openssl rand -hex 32`).
3. Register the webhook once per environment (and again if the URL or secret changes):

   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://api.bookie.mnavasardian.com/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
     -d 'allowed_updates=["message"]'
   ```

   Telegram then sends that secret in `X-Telegram-Bot-Api-Secret-Token` with every update,
   and the route refuses anything without it.
4. Local development: tunnel the API (`ngrok http 9004`) and point `setWebhook` at the tunnel.
   Use a separate test bot — a bot has one webhook at a time.

With the three variables empty the channel is simply off: `GET /telegram/status` reports
`available: false`, the tab says so, and every notice goes by email.

## The calendar feed

Not a notification, but the same promise — bookings showing up where the provider already
looks. `GET /calendar/<providerId>/<token>.ics` (`routes/calendar.ts`) is a private iCal feed
of the provider's live bookings, 30 days back to a year ahead, for Basic and up. The token is
an HMAC of the provider id and `calendarFeedVersion`, so nothing secret is stored; *Reset
link* bumps the version and revokes every copy. A client's single booking downloads as an
`.ics` from `GET /appointments/manage/:token/ics` — free, behind the same capability token as
the manage page.

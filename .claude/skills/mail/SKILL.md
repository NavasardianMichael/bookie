---
name: mail
description: Send email from this repo through the external mail engine (MAIL_API_URL). Covers the internal-vs-external endpoint split, the request contract for both, how the API key is held, what to do when the engine is unconfigured or fails, and how to add a new mail type. Use whenever a feature needs to send, notify, verify by email, or forward a form submission. Triggers on "send an email", "notification email", "verify email", "contact form", "booking reminder", "mail engine".
---

# Sending mail

All mail goes through one external engine, reached **only** from the API server.
`server/src/lib/mail.ts` is the sole client and the only module that reads
`MAIL_API_KEY`. The hard rules also live in `server/CLAUDE.md`, which loads
automatically for any work under `server/`.

## Two endpoints, and the split is a real boundary

| Endpoint | Reaches | `to` | Used by |
|---|---|---|---|
| `/mail/internal/send` | **us** — the admin inbox | engine-owned, **never sent** | contact form, admin alerts |
| `/mail/external/send` | **a user** | **required** | email verification, booking mail, provider notifications |

So an internal send cannot be aimed anywhere — that is the point of it. An external send
must name an address the caller already holds and the user has proven.

**Never** reach for `internal` to mail a user, or `external` to mail ourselves.

```ts
import { sendExternalMail, sendInternalMail } from '../lib/mail.js'

await sendInternalMail({ subject, body, senderEmail, firstName, lastName, details })
await sendExternalMail({ to, subject, text, html, replyTo })
```

Both resolve to a `MailResult` — `{ ok: true, messageId? }` or
`{ ok: false, status, message }` — and **never throw**. `status: 0` means the request
never left: unconfigured, timed out, or DNS.

## The request contract

`appId` is required by the engine on both endpoints and is injected by `mail.ts` from
`config.mail.appId`. Do not pass it at a call site.

`/mail/internal/send` — every field but `appId` optional; the engine substitutes
`'Contact Form Submission'`, `'No message provided'`, `'Anonymous'`:

```
subject?  body?  senderEmail?  firstName?  lastName?  phoneNumber?
details?  (object, rendered alongside — keep small and non-sensitive)
website?  (honeypot; must be empty)
```

`/mail/external/send`:

```
to  subject          (all required)
text / html          (at least one; send both so text-only clients render)
replyTo?
```

Engine responses: `200 { success, message, messageId }`; `401` missing key, `403` invalid
key, `400` validation (with an `errors` array), `429` rate limited, `500` engine fault.

## Five things to get right

1. **Escape every visitor-authored value before it reaches an HTML body.** The engine
   sanitises with DOMPurify, which strips scripts and handlers — it does **not** stop an
   `<a href>` or `<img>` a visitor typed from rendering as our markup. Use `escapeHtml`
   from `mail.ts`, or prefer the plain-text field and skip the template. A value built
   entirely from our own origin and already-validated input (the verification URL) is the
   only exception, and it is commented as such.

2. **Rate limiting is shared.** The engine allows 10 requests/minute **per IP as it sees
   them**, and it only ever sees this server — so every visitor shares one bucket with
   transactional mail. Any publicly reachable route that sends must limit at our edge
   first: `createRateLimiter` in `server/src/lib/rateLimit.ts` (in-memory, per-process;
   move it to Redis before running more than one API instance).

3. **Unconfigured is normal in dev, an outage in production.** `.env.example` ships an
   empty `MAIL_API_KEY`, so `isMailConfigured()` is false locally. Mirror what the OTP and
   verification flows already do — log and report success in dev, fail in production:

   ```ts
   if (!isMailConfigured()) {
     if (config.nodeEnv === 'production') return fail(res, '…temporarily unavailable…', 503, 503)
     console.log(`[contact] …`)
     return ok(res, true)
   }
   ```

4. **Decide deliberately whether a failed send is the user's problem.** Both live callers
   surface it, because nothing is persisted behind them: a swallowed failure would leave a
   visitor believing a message was sent, or waiting on a verification link that was never
   mailed. Map `429` through as `429` and anything else as `502`. Swallow a failure only
   where something durable already holds the request.

5. **Never call the engine from the frontend.** `src/` has no key and adding one would
   ship it to the browser. The client posts to our own API, which forwards — that is why
   `POST /contact` exists at all.

## Adding a new mail type

1. Pick the endpoint from the table above by **who receives it**, not by what it says.
2. Put the subject and the `text`/`html` builders next to the feature that owns them —
   `lib/email-verify.ts` is the worked example, not `mail.ts`, which stays transport-only.
3. Send `text` **and** `html`, and put the URL literally in the text body.
4. Escape interpolated request-body values (rule 1).
5. Handle the `MailResult` (rules 3 and 4). It never throws, so an ignored return value is
   a silently dropped email.
6. If the route is public, add a rate limit (rule 2).

## Environment

`server/.env.example` carries the placeholders; `server/src/config.ts` reads them.

```
MAIL_API_URL   base URL, no trailing slash needed (config strips one)
MAIL_API_KEY   sent as the `x-api-key` header; empty disables sending
MAIL_APP_ID    identifies this app to the engine; must match the id registered there
```

Never read, print, or paste a real `.env` value — the root `CLAUDE.md` env rule applies
here as everywhere, and `mail.ts` deliberately keeps the key out of every log line and
error message. A failed send logs the status and the engine's own message, never headers.

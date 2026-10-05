import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveCookieDomain } from './lib/cookie-domain.js'

import './load-env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nodeEnv = process.env.NODE_ENV ?? 'development'
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:7004'

export const config = {
  port: Number(process.env.PORT ?? 9004),
  /**
   * Interface to bind. Defaults to every interface so a container or a LAN device can
   * reach the dev server; production sets `HOST=127.0.0.1` so only nginx can.
   */
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  corsOrigin,
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '../uploads')),
  nodeEnv,
  cookieName: 'bookie_session',
  /**
   * `Domain` on the session cookie. **Empty means host-only**, which is what a browser does
   * by default and what local dev wants.
   *
   * It exists because the two halves of this app are served from different hosts in
   * production — `bookie.<domain>` and `api.bookie.<domain>` — while local dev runs both on
   * `localhost`, and cookies ignore the port. So a host-only cookie set by the API is
   * visible to the web app locally and invisible to it in production. `src/proxy.ts` guards
   * every signed-in route on the *web* host by checking this cookie is present, so in
   * production it sent every signed-in user straight back to sign-in. Nothing reproduced in
   * dev, and the API itself was fine throughout — the browser's XHRs to `api.` did carry the
   * cookie, so the client believed it held a session right up until it navigated.
   *
   * It is the **web** host, not this one: `bookie.<domain>` covers itself and every
   * subdomain, which is exactly `api.bookie.<domain>` and nothing else. The bare registrable
   * domain would also hand this session JWT to every unrelated app on a sibling subdomain —
   * which is why this is not simply `.<domain>`.
   *
   * Derived from `CORS_ORIGIN` rather than demanded as its own variable, because this is
   * the one setting whose absence is invisible: a missing `Domain` is a perfectly valid
   * host-only cookie and the API notices nothing. Requiring an operator to add a variable
   * they have never heard of would simply reproduce the outage on the next environment.
   * `COOKIE_DOMAIN` overrides it, for a topology where the API is **not** a subdomain of the
   * web host — a browser silently drops a `Domain` the setting host does not belong to, so
   * that case has to be stated rather than guessed. See `lib/cookie-domain.ts`.
   */
  cookieDomain: process.env.COOKIE_DOMAIN ?? deriveCookieDomain(nodeEnv, corsOrigin),
  /** Cookie holding an in-flight Google OAuth flow. Scoped to `/identity/google`. */
  oauthCookieName: 'bookie_oauth',
  /** Cookie holding a verified Google identity awaiting its phone number. */
  oauthPendingCookieName: 'bookie_oauth_pending',
  /** Email-verification links last a day — they are clicked from an inbox, not typed in. */
  emailVerifyTtlMs: 24 * 60 * 60 * 1000,
  /**
   * A password-reset link is a full credential, so it lives far shorter than the
   * verification link above.
   */
  passwordResetTtlMs: 60 * 60 * 1000,
  /** An OAuth round trip through Google, generously. Both OAuth cookies expire with it. */
  oauthFlowTtlMs: 10 * 60 * 1000,
  /** Long enough to fill in a phone number after Google returns, short enough to matter. */
  oauthPendingTtlMs: 15 * 60 * 1000,
  /**
   * Who may reach `/admin/*`. Comma-separated addresses, matched case-insensitively
   * against the signed-in user's identity email by `middleware/auth.ts#requireAdmin`.
   *
   * An allowlist rather than a column on `User`, because there is no admin *account*
   * here: `SessionPayload.role` is only `consumer | provider`, and an admin signs in with
   * whichever of those they already have. Config also means promoting someone is a deploy
   * rather than a database write nobody reviews, and demoting them cannot be done by
   * anyone who has compromised an account.
   *
   * **Empty by default, and an empty list admits nobody.** A fresh clone has no admin
   * surface at all rather than one guarded by a value someone forgot to change.
   */
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  /**
   * External mail engine. Read only by `lib/mail.ts` — nothing else may touch `apiKey`.
   *
   * An empty `apiUrl` or `apiKey` disables sending rather than throwing, which is what
   * `.env.example` ships: local dev has no key, so the contact form still stores its
   * message and the verification link still prints to this console.
   */
  mail: {
    apiUrl: (process.env.MAIL_API_URL ?? '').replace(/\/+$/, ''),
    apiKey: process.env.MAIL_API_KEY ?? '',
    /** Identifies this app to the engine; must match the id registered there. */
    appId: process.env.MAIL_APP_ID ?? 'bookie',
  },
  /**
   * Google OAuth. `clientSecret` is read **only** by `lib/google-oauth.ts` — nothing else
   * may touch it, and it is never returned, logged, or put in an error, exactly as
   * `mail.apiKey` is treated. `clientId` is not a secret (it appears in the authorization
   * URL) but lives beside it.
   *
   * Empty values disable the flow rather than throwing — the same bargain `mail` makes, so
   * a fresh clone starts and the Google button is simply unavailable.
   *
   * `redirectUri` points at the **API**, not the web app: only this process holds
   * `jwtSecret`, so only it can mint the session cookie, so the callback has to land here.
   * How far that cookie then reaches is `cookieDomain`'s job, not this one's.
   */
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:9004/identity/google/callback',
  },
  /**
   * Paddle Billing — provider subscriptions (docs/PADDLE_SETUP.md). `apiKey` is read **only**
   * by `lib/paddle.ts`, exactly as `mail.apiKey` is by `lib/mail.ts`.
   *
   * Empty disables billing rather than throwing, the bargain `mail` and `google` make: a fresh
   * clone prices the plans in USD and offers the contact-form request instead of a checkout.
   *
   * `webhookSecrets` is a list because a Paddle notification destination's secret cannot be
   * regenerated in place — rotating it means a second destination, and for that window both
   * secrets sign real events. `sandbox` must agree with the web's `NEXT_PUBLIC_PADDLE_ENV`.
   */
  paddle: {
    apiKey: process.env.PADDLE_API_KEY ?? '',
    webhookSecrets: (process.env.PADDLE_WEBHOOK_SECRET ?? '')
      .split(',')
      .map((secret) => secret.trim())
      .filter(Boolean),
    sandbox: process.env.PADDLE_SANDBOX === 'true',
    priceIds: {
      basic: process.env.PADDLE_PRICE_ID_BASIC ?? '',
      standard: process.env.PADDLE_PRICE_ID_STANDARD ?? '',
      premium: process.env.PADDLE_PRICE_ID_PREMIUM ?? '',
    },
  },
  /**
   * The Telegram bot that carries notifications beside email (docs/NOTIFICATIONS.md).
   * `botToken` is read **only** by `lib/telegram.ts`. `webhookSecret` is the `secret_token`
   * given to `setWebhook`; Telegram echoes it in a header, which is how a forged update is
   * told apart from a real one. Empty disables the channel — the Connect button reports it
   * unavailable and every notice goes by email alone.
   */
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    botUsername: (process.env.TELEGRAM_BOT_USERNAME ?? '').replace(/^@/, ''),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
  },
  /**
   * The appointment-reminder job (`jobs/reminderJob.ts`). On by default; `REMINDERS_ENABLED=false`
   * turns it off for a second API process, should one ever run — the sends are claimed by
   * compare-and-set, so two would not double-send, but there is no reason to poll twice.
   */
  remindersEnabled: process.env.REMINDERS_ENABLED !== 'false',
}

/**
 * Whether Google sign-in can be offered at all. Lives here rather than in
 * `lib/google-oauth.ts` so `app.ts` can report it on `/health` without importing the OAuth
 * client — the web app needs the answer to decide whether to render the button.
 */
export const isGoogleOAuthConfigured = (): boolean =>
  Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri)

/**
 * Whether a checkout can be offered at all: an API key and at least one price. Which plans
 * are actually for sale is per price — `isPlanPurchasable` in `routes/plans.ts`.
 */
export const isPaddleConfigured = (): boolean =>
  Boolean(config.paddle.apiKey && Object.values(config.paddle.priceIds).some(Boolean))

/** Whether the Connect button can work: a bot to message, a name to link to, a secret to check. */
export const isTelegramConfigured = (): boolean =>
  Boolean(config.telegram.botToken && config.telegram.botUsername && config.telegram.webhookSecret)

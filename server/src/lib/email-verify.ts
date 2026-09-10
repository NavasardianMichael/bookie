import { isMailConfigured, type MailResult, sendExternalMail } from './mail.js'
import { prisma } from './prisma.js'
import { hashUrlToken, mintUrlToken, urlTokensMatch } from './token.js'
import { config } from '../config.js'

/** Query param the verification link puts on the account profile URL. */
export const EMAIL_VERIFY_QUERY = 'verifyEmail'

/**
 * The token machinery now lives in `lib/token.ts` so the password-reset flow shares one
 * implementation rather than growing a second, subtly different one. Re-exported under the
 * original names because `routes/identity.ts` already calls them.
 */
export const mintEmailVerifyToken = mintUrlToken
export const hashEmailVerifyToken = hashUrlToken
export const emailVerifyTokensMatch = urlTokensMatch

/**
 * The return-path allowlist moved to `lib/return-path.ts` — this file imports config,
 * Prisma and the mail client, which put the open-redirect guards out of reach of
 * `tests/unit/server/`.
 */
export { isAllowedEmailVerifyReturnPath, isAllowedPublicReturnPath } from './return-path.js'

const emailVerifyExpiry = (): Date => new Date(Date.now() + config.emailVerifyTtlMs)

export const buildEmailVerifyUrl = (origin: string, returnPath: string, token: string): string => {
  const url = new URL(returnPath, origin.endsWith('/') ? origin : `${origin}/`)
  url.searchParams.set(EMAIL_VERIFY_QUERY, token)
  return url.toString()
}

/**
 * Stores the pending address and a hash of the one-time link token. Returns the
 * raw token so the caller can put it in the email — never persist the raw value.
 *
 * Issuing a new token overwrites any previous one, which is the invalidate-on-reissue that
 * a "resend the link" button needs: the older email stops working the moment a newer one
 * is sent.
 *
 * Used by **both** flows. Signup writes the address to `email` *and* `pendingEmail` (see
 * `routes/identity.ts`), so confirming is one unconditional path — copy `pendingEmail` onto
 * `email`, stamp `emailVerifiedAt`, clear the token — with no flow discriminator to get
 * wrong. The `user_email_verify_token_has_pending` CHECK is what keeps a token from
 * outliving the address it verifies.
 */
export async function issuePendingEmailVerify(userId: string, email: string): Promise<string> {
  const token = mintEmailVerifyToken()

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: email,
      emailVerifyTokenHash: hashEmailVerifyToken(token),
      emailVerifyExpiresAt: emailVerifyExpiry(),
    },
  })

  return token
}

/**
 * Dev ships an empty `MAIL_API_KEY`, so nothing is actually sent there — this prints the
 * clickable URL to the API console instead, which is how a local signup gets verified.
 * Production must not print the token: logs get shipped.
 */
const logVerificationEmail = (to: string, verifyUrl: string): void => {
  if (config.nodeEnv === 'production') return
  console.log(`[mail] Verify ${to}\n${verifyUrl}`)
}

const verificationSubject = 'Confirm your email address'

/**
 * Both bodies are sent: `text` is what a plain-text client shows, and it also matters
 * that the URL appears literally there — an address that mangles HTML still leaves
 * something clickable or copyable.
 */
const verificationText = (verifyUrl: string): string =>
  `Confirm your email address for Bookie by opening this link:\n\n${verifyUrl}\n\n` +
  `The link is valid for 24 hours. If you did not request this, ignore this email.`

const verificationHtml = (verifyUrl: string): string =>
  `<p>Confirm your email address for Bookie:</p>` +
  `<p><a href="${verifyUrl}">Confirm email address</a></p>` +
  `<p>The link is valid for 24 hours. If you did not request this, ignore this email.</p>`

/**
 * Sends the verification link through the mail engine's **external** endpoint — the one
 * that reaches a user. `to` is the address being verified, which is the only address this
 * may ever be aimed at.
 *
 * `verifyUrl` is interpolated raw and deliberately not escaped: it is built by
 * `buildEmailVerifyUrl` from our own origin and a path already checked by
 * `isAllowedEmailVerifyReturnPath` or `isAllowedPublicReturnPath`, so no request-body text
 * reaches this markup.
 *
 * Local dev ships an empty `MAIL_API_KEY`, so there it logs the link and reports success.
 * In production an unconfigured or failing engine is reported to the caller — but note
 * that only `change-email/send` surfaces it. Registration deliberately swallows a send
 * failure, because a 502 on a new address next to a 200 on an existing one turns the
 * endpoint into an account-enumeration oracle; `resend-verification` is the recovery path.
 */
export const sendVerificationEmail = async (to: string, verifyUrl: string): Promise<MailResult> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') {
      return { ok: false, status: 0, message: 'Mail engine is not configured' }
    }
    logVerificationEmail(to, verifyUrl)
    return { ok: true }
  }

  const result = await sendExternalMail({
    to,
    subject: verificationSubject,
    text: verificationText(verifyUrl),
    html: verificationHtml(verifyUrl),
  })

  // Still print it in dev even when a key is present, so a local run does not depend on
  // reaching the inbox to click through.
  if (result.ok) logVerificationEmail(to, verifyUrl)

  return result
}

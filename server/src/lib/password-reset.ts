import { isMailConfigured, type MailResult, sendExternalMail } from './mail.js'
import { prisma } from './prisma.js'
import { hashUrlToken, mintUrlToken } from './token.js'
import { config } from '../config.js'

/**
 * Password-reset links.
 *
 * Shares `lib/token.ts` with email verification rather than growing a second token
 * implementation — the hash-at-rest and the constant-time compare are exactly the parts
 * that must not be re-derived slightly differently.
 *
 * Unlike the 24-hour verification link, a reset link is a **full credential**: whoever
 * holds it can take the account. Hence the much shorter `passwordResetTtlMs`.
 */

/** Query param the reset link carries. Mirrors `EMAIL_VERIFY_QUERY`'s role. */
export const PASSWORD_RESET_QUERY = 'token'

const resetExpiry = (): Date => new Date(Date.now() + config.passwordResetTtlMs)

/**
 * Stores the hash of a fresh reset token and returns the raw value for the email.
 *
 * Overwrites any token already on the row, so issuing a new link invalidates the previous
 * one — the invalidate-on-reissue a reset flow needs, obtained here from the column being
 * single-valued rather than from a `deleteMany` over a token table.
 */
export const issuePasswordResetToken = async (userId: string): Promise<string> => {
  const token = mintUrlToken()

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetTokenHash: hashUrlToken(token),
      passwordResetExpiresAt: resetExpiry(),
    },
  })

  return token
}

/**
 * The reset URL is composed **by us** from a locale, not from a caller-supplied
 * `returnPath`. The highest-volume unauthenticated link in the system therefore has no
 * open-redirect surface to guard rather than a guarded one.
 */
export const buildPasswordResetUrl = (origin: string, locale: string, token: string): string => {
  const url = new URL(`/${locale}/auth/reset-password`, origin.endsWith('/') ? origin : `${origin}/`)
  url.searchParams.set(PASSWORD_RESET_QUERY, token)
  return url.toString()
}

/** Dev has no mail key, so the link goes to the API console. Never printed in production. */
const logResetLink = (to: string, resetUrl: string): void => {
  if (config.nodeEnv === 'production') return
  console.log(`[mail] Password reset ${to}\n${resetUrl}`)
}

const resetSubject = 'Reset your Bookie password'

const resetText = (resetUrl: string): string =>
  `Someone asked to reset the password for your Bookie account.\n\n${resetUrl}\n\n` +
  `The link is valid for one hour and can be used once. If this was not you, ignore this ` +
  `email — your password has not changed.`

const resetHtml = (resetUrl: string): string =>
  `<p>Someone asked to reset the password for your Bookie account.</p>` +
  `<p><a href="${resetUrl}">Choose a new password</a></p>` +
  `<p>The link is valid for one hour and can be used once. If this was not you, ignore ` +
  `this email — your password has not changed.</p>`

/**
 * `resetUrl` is interpolated raw and deliberately not escaped: it is built above from our
 * own origin, an allowlisted locale and a hex token, so no request-body text reaches this
 * markup. **The recipient's address is never interpolated** — they know it, and printing it
 * back would be the only untrusted value in the template.
 *
 * The caller **must not** surface a failure here. `POST /identity/forgot-password` answers
 * identically whether or not an account exists, and a 502 on a real address beside a 200 on
 * an unknown one would turn that route into an enumeration oracle.
 */
export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<MailResult> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') {
      return { ok: false, status: 0, message: 'Mail engine is not configured' }
    }
    logResetLink(to, resetUrl)
    return { ok: true }
  }

  const result = await sendExternalMail({
    to,
    subject: resetSubject,
    text: resetText(resetUrl),
    html: resetHtml(resetUrl),
  })

  if (result.ok) logResetLink(to, resetUrl)
  return result
}

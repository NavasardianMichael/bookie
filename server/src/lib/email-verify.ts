import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { isMailConfigured, type MailResult, sendExternalMail } from './mail.js'
import { prisma } from './prisma.js'
import { config } from '../config.js'

/** Query param the verification link puts on the account profile URL. */
export const EMAIL_VERIFY_QUERY = 'verifyEmail'

export const mintEmailVerifyToken = (): string => randomBytes(32).toString('hex')

export const hashEmailVerifyToken = (token: string): string => createHash('sha256').update(token).digest('hex')

export const emailVerifyTokensMatch = (token: string, storedHash: string): boolean => {
  const actual = Buffer.from(hashEmailVerifyToken(token))
  const expected = Buffer.from(storedHash)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

const emailVerifyExpiry = (): Date => new Date(Date.now() + config.emailVerifyTtlMs)

/**
 * The link must land on the caller's own settings profile, never an open redirect.
 * Locales are listed rather than matched with a regex so a ReDoS linter cannot
 * fire; keep in step with `src/i18n/config.ts` LOCALES.
 */
const VERIFY_LOCALES = new Set([
  'en',
  'es',
  'pt-BR',
  'fr',
  'it',
  'de',
  'ar',
  'zh-CN',
  'ja',
  'hy',
  'id',
  'ko',
  'uk',
  'pl',
  'th',
])

export const isAllowedEmailVerifyReturnPath = (returnPath: string, role: 'provider' | 'consumer'): boolean => {
  const parts = returnPath.split('/')
  if (parts.length !== 4 || parts[0] !== '' || parts[3] !== 'profile') return false
  const locale = parts[1]
  const area = parts[2]
  if (!locale || !VERIFY_LOCALES.has(locale)) return false
  return area === (role === 'provider' ? 'providers' : 'consumers')
}

export const buildEmailVerifyUrl = (origin: string, returnPath: string, token: string): string => {
  const url = new URL(returnPath, origin.endsWith('/') ? origin : `${origin}/`)
  url.searchParams.set(EMAIL_VERIFY_QUERY, token)
  return url.toString()
}

/**
 * Stores the pending address and a hash of the one-time link token. Returns the
 * raw token so the caller can put it in the email — never persist the raw value.
 */
export async function issuePendingEmailVerify(userId: string, email: string): Promise<string> {
  const token = mintEmailVerifyToken()

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: email,
      emailOtpHash: hashEmailVerifyToken(token),
      emailOtpExpiresAt: emailVerifyExpiry(),
    },
  })

  return token
}

/**
 * Dev has no mail key. The OTP flow logs the code; this logs the clickable URL.
 * Production must not print the token — logs get shipped.
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
 * `buildEmailVerifyUrl` from our own origin and a `returnPath` already checked by
 * `isAllowedEmailVerifyReturnPath`, so no request-body text reaches this markup.
 *
 * Local dev ships an empty `MAIL_API_KEY`, so there it logs the link and reports success
 * — the same bargain the OTP flow makes. In production an unconfigured or failing engine
 * is reported, because a verification email that silently never arrives leaves the user
 * waiting on a link that does not exist.
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

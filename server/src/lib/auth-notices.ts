import { isMailConfigured, type MailResult, sendExternalMail } from './mail.js'
import { config } from '../config.js'

/**
 * Account notices that carry **no token** — they tell someone something happened, and the
 * action (if any) is to go and sign in.
 *
 * Separate from `lib/email-verify.ts` and `lib/password-reset.ts` because those own a token
 * lifecycle and these own none; grouping them would suggest a link where there is not one.
 *
 * **Nothing requester-authored is interpolated into any body here.** Two of these are sent
 * to an address the *requester* supplied while proving nothing about it, so the recipient's
 * own address — the one value that would otherwise be attacker-influenced text in an HTML
 * mail — is deliberately never printed back. They already know it.
 *
 * Every send is **advisory**: the caller logs a failure and carries on. These mails exist
 * beside a response that is identical whether or not an account exists, so surfacing a
 * failure here would leak exactly what that response is hiding.
 */

const notice = async (to: string, subject: string, text: string, html: string): Promise<MailResult> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') {
      return { ok: false, status: 0, message: 'Mail engine is not configured' }
    }
    // Only the subject, never the body: these bodies are the "someone tried to register as
    // you" class of message, and a dev console is not the place to accumulate them.
    console.log(`[mail] ${subject} -> ${to}`)
    return { ok: true }
  }

  return sendExternalMail({ to, subject, text, html })
}

const signInUrl = (locale: string): string => {
  const origin = config.corsOrigin.endsWith('/') ? config.corsOrigin : `${config.corsOrigin}/`
  return new URL(`/${locale}/auth/sign-in`, origin).toString()
}

/**
 * Sent when someone submits the registration form with an address that **already has a
 * verified account**.
 *
 * This is what lets `POST /identity/register` answer "check your email" for every address
 * without either lying to the real owner or confirming to a stranger that the account
 * exists. The one person who learns anything is the account holder, in their own inbox.
 */
export const sendAlreadyRegisteredNotice = (to: string, locale: string): Promise<MailResult> => {
  const url = signInUrl(locale)
  return notice(
    to,
    'Someone tried to register with your email',
    `Someone tried to create a Bookie account with your email address. You already have ` +
      `one, so nothing has changed.\n\nIf it was you, sign in instead:\n${url}\n\n` +
      `If you have forgotten your password, use "Forgot password" on that page. If it was ` +
      `not you, no action is needed.`,
    `<p>Someone tried to create a Bookie account with your email address. You already ` +
      `have one, so nothing has changed.</p>` +
      `<p>If it was you, <a href="${url}">sign in instead</a>. If you have forgotten your ` +
      `password, use &quot;Forgot password&quot; on that page.</p>` +
      `<p>If it was not you, no action is needed.</p>`
  )
}

/**
 * Sent when a **passwordless** (Google-only) account asks for a password reset.
 *
 * Silence would be the alternative, and it reads as a broken reset flow: the user asked for
 * an email, got nothing, and tries again. Telling them where their sign-in actually lives
 * is both more useful and no more revealing — it goes only to the account's own address.
 */
export const sendGoogleSignInGuidance = (to: string, locale: string): Promise<MailResult> => {
  const url = signInUrl(locale)
  return notice(
    to,
    'Sign in to Bookie with Google',
    `You asked to reset your Bookie password, but this account signs in with Google and ` +
      `has no password set.\n\nUse the "Continue with Google" button here:\n${url}`,
    `<p>You asked to reset your Bookie password, but this account signs in with Google and ` +
      `has no password set.</p>` +
      `<p>Use the <strong>Continue with Google</strong> button on the <a href="${url}">sign-in page</a>.</p>`
  )
}

/**
 * Sent after a password actually changes, by reset or from the account settings.
 *
 * The point is detection, not confirmation: if the owner did not do this, this mail is how
 * they find out. It says every other session was signed out because that is what bumping
 * `tokenVersion` does, and knowing it explains why their other device asked them to log in.
 */
export const sendPasswordChangedNotice = (to: string, locale: string): Promise<MailResult> => {
  const url = signInUrl(locale)
  return notice(
    to,
    'Your Bookie password was changed',
    `The password for your Bookie account was just changed, and every other signed-in ` +
      `device was signed out.\n\nIf this was you, nothing further is needed. If it was ` +
      `not, reset your password immediately:\n${url}`,
    `<p>The password for your Bookie account was just changed, and every other signed-in ` +
      `device was signed out.</p>` +
      `<p>If this was you, nothing further is needed. If it was not, ` +
      `<a href="${url}">reset your password immediately</a>.</p>`
  )
}

/**
 * Sent when a Google identity is attached to an existing account — either linked to a
 * verified password account, or claimed on an unverified one.
 *
 * `passwordRemoved` distinguishes the two, and it matters: on the claim path the account's
 * password is deleted, so anyone who had set one loses that route in. Saying so is the only
 * way the rightful owner can notice a claim they did not make.
 */
export const sendGoogleConnectedNotice = (
  to: string,
  locale: string,
  passwordRemoved: boolean
): Promise<MailResult> => {
  const url = signInUrl(locale)
  const tail = passwordRemoved
    ? `Any password previously set on this account has been removed, so Google is now the ` +
      `only way in.`
    : `Your existing password still works.`

  return notice(
    to,
    'Google was connected to your Bookie account',
    `A Google account was connected to your Bookie account, and you can now sign in with ` +
      `it.\n\n${tail}\n\nIf this was not you, reset your password here:\n${url}`,
    `<p>A Google account was connected to your Bookie account, and you can now sign in ` +
      `with it.</p><p>${tail}</p>` +
      `<p>If this was not you, <a href="${url}">reset your password</a>.</p>`
  )
}

/**
 * Sent to the address a change is moving **away from**.
 *
 * The new address gets a verification link; this one gets a warning, and it is the only
 * signal the previous owner of the account would ever see. Without it, an attacker holding
 * a stolen session could migrate the account to their own address in silence.
 */
export const sendEmailChangeStartedNotice = (to: string, locale: string): Promise<MailResult> => {
  const url = signInUrl(locale)
  return notice(
    to,
    'Your Bookie email address is being changed',
    `Someone asked to change the email address on your Bookie account. The change only ` +
      `takes effect once the new address is confirmed.\n\nIf this was not you, sign in ` +
      `and change your password immediately:\n${url}`,
    `<p>Someone asked to change the email address on your Bookie account. The change only ` +
      `takes effect once the new address is confirmed.</p>` +
      `<p>If this was not you, <a href="${url}">sign in and change your password immediately</a>.</p>`
  )
}

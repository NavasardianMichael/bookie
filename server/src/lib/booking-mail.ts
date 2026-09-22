import { escapeHtml, isMailConfigured, type MailResult, sendExternalMail } from './mail.js'
import { config } from '../config.js'

/**
 * Re-exported rather than declared here. They live in `return-path.ts` because that
 * module imports nothing but `request.ts` and is therefore the only half of an
 * emailed-link pair a unit test can reach — the same move `buildEmailVerifyUrl` made,
 * for the same reason. Call sites import them from this module regardless.
 */
export { buildApprovalsUrl, buildProviderPageUrl, PROVIDER_APPROVALS_PATH } from './return-path.js'

/**
 * Booking mail after `POST /appointments` and after a public reschedule.
 * The appointment is already saved by the time this runs — a send failure must
 * never fail the booking.
 *
 * Mirrors `email-verify.ts` / `password-reset.ts`: `mail.ts` stays transport-only,
 * visitor names are escaped before they reach HTML, and an empty `MAIL_API_KEY`
 * in dev logs the manage URL instead of sending.
 */

const BOOKING_LOCALES = new Set([
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

export const resolveBookingLocale = (value: unknown): string =>
  typeof value === 'string' && BOOKING_LOCALES.has(value) ? value : 'en'

export const buildBookingManageUrl = (origin: string, locale: string, token: string): string => {
  const url = new URL(`/${locale}/b/${token}`, origin.endsWith('/') ? origin : `${origin}/`)
  return url.toString()
}

const logBookingLink = (to: string, manageUrl: string): void => {
  if (config.nodeEnv === 'production') return
  console.log(`[mail] Booking confirmation ${to}\n${manageUrl}`)
}

/**
 * What every consumer-facing booking email names. One shape for all four so a new
 * message cannot quietly omit the service or the time — the two things the reader is
 * actually looking for.
 */
type BookingNotice = {
  to: string
  firstName: string
  providerName: string
  serviceName: string
  when: string
  manageUrl: string
}

/**
 * The engine-unconfigured branch, written once. Every sender below repeats the same
 * three lines otherwise, and the one that forgets the production `503` is the one that
 * silently swallows a real outage.
 */
const unconfigured = (logLine: string): MailResult | null => {
  if (isMailConfigured()) return null
  if (config.nodeEnv === 'production') {
    return { ok: false, status: 0, message: 'Mail engine is not configured' }
  }
  console.log(`[mail] ${logLine}`)
  return { ok: true }
}

const bookingSubject = 'Your booking is confirmed'

/**
 * The booker's receipt for a booking that needed no approval.
 *
 * It names the service and the time as well as the provider. It used to name only the
 * provider and a link, which meant the one email a visitor keeps was the one place the
 * appointment they had just made was not written down.
 */
export const sendBookingConfirmationEmail = async (input: BookingNotice): Promise<MailResult> => {
  const skipped = unconfigured(`Booking confirmation ${input.to}
${input.manageUrl}`)
  if (skipped) return skipped

  const result = await sendExternalMail({
    to: input.to,
    subject: bookingSubject,
    text:
      `Hi ${input.firstName},

` +
      `Your ${input.serviceName} booking with ${input.providerName} is confirmed for:

` +
      `${input.when}

` +
      `Open this link to view, cancel, or change the time:

${input.manageUrl}

` +
      `If you did not make this booking, you can ignore this email.`,
    html:
      `<p>Hi ${escapeHtml(input.firstName)},</p>` +
      `<p>Your ${escapeHtml(input.serviceName)} booking with ` +
      `${escapeHtml(input.providerName)} is confirmed for:</p>` +
      `<p><strong>${escapeHtml(input.when)}</strong></p>` +
      // `manageUrl` is built by `buildBookingManageUrl` from our origin, an allowlisted
      // locale, and a hex token we minted — no request-body text reaches this href.
      `<p><a href="${input.manageUrl}">View, cancel, or change the time</a></p>` +
      `<p>If you did not make this booking, you can ignore this email.</p>`,
  })

  if (result.ok) logBookingLink(input.to, input.manageUrl)
  return result
}

export const formatBookingWhen = (startAt: Date): string =>
  new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(startAt)

const rescheduleGuestSubject = 'Your booking has been updated'

const rescheduleGuestText = (input: {
  firstName: string
  providerName: string
  when: string
  manageUrl: string
}): string =>
  `Hi ${input.firstName},\n\n` +
  `Your booking with ${input.providerName} has been moved to:\n\n` +
  `${input.when}\n\n` +
  `Open this link to view, cancel, or change the time:\n\n` +
  `${input.manageUrl}\n`

const rescheduleGuestHtml = (input: {
  firstName: string
  providerName: string
  when: string
  manageUrl: string
}): string =>
  `<p>Hi ${escapeHtml(input.firstName)},</p>` +
  `<p>Your booking with ${escapeHtml(input.providerName)} has been moved to:</p>` +
  `<p><strong>${escapeHtml(input.when)}</strong></p>` +
  `<p><a href="${input.manageUrl}">View, cancel, or change the time</a></p>`

const rescheduleProviderSubject = 'A booking has been changed'

const rescheduleProviderText = (input: {
  providerFirstName: string
  guestName: string
  serviceName: string
  when: string
}): string =>
  `Hi ${input.providerFirstName},\n\n` +
  `${input.guestName} has changed their ${input.serviceName} appointment to:\n\n` +
  `${input.when}\n\n` +
  `The new time is now on your calendar.\n`

const rescheduleProviderHtml = (input: {
  providerFirstName: string
  guestName: string
  serviceName: string
  when: string
}): string =>
  `<p>Hi ${escapeHtml(input.providerFirstName)},</p>` +
  `<p>${escapeHtml(input.guestName)} has changed their ${escapeHtml(input.serviceName)} appointment to:</p>` +
  `<p><strong>${escapeHtml(input.when)}</strong></p>` +
  `<p>The new time is now on your calendar.</p>`

export const sendBookingRescheduledToGuestEmail = async (input: {
  to: string
  firstName: string
  providerName: string
  when: string
  manageUrl: string
}): Promise<MailResult> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') {
      return { ok: false, status: 0, message: 'Mail engine is not configured' }
    }
    logBookingLink(input.to, input.manageUrl)
    return { ok: true }
  }

  return sendExternalMail({
    to: input.to,
    subject: rescheduleGuestSubject,
    text: rescheduleGuestText(input),
    html: rescheduleGuestHtml(input),
  })
}

export const sendBookingRescheduledToProviderEmail = async (input: {
  to: string
  providerFirstName: string
  guestName: string
  serviceName: string
  when: string
}): Promise<MailResult> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') {
      return { ok: false, status: 0, message: 'Mail engine is not configured' }
    }
    console.log(`[mail] Booking reschedule (provider) ${input.to}\n${input.when}`)
    return { ok: true }
  }

  return sendExternalMail({
    to: input.to,
    subject: rescheduleProviderSubject,
    text: rescheduleProviderText(input),
    html: rescheduleProviderHtml(input),
  })
}

/* ------------------------------------------------------------------ *
 * Approval mail.
 *
 * Four messages, because a booking that needs a decision has four moments worth an
 * email and the existing "Your booking is confirmed" is true at none of them. Sending
 * that one to someone whose request is still queued is the bug this section exists to
 * prevent: they would arrive to a slot the provider never accepted.
 *
 * All four keep the module's existing bargain — the row is already committed, so an
 * unconfigured engine logs in dev, `503`s in production, and a caller that ignores the
 * result silently drops the mail. See `server/CLAUDE.md`.
 * ------------------------------------------------------------------ */

const requestedSubject = 'We have your booking request'

export const sendBookingRequestedEmail = async (input: BookingNotice): Promise<MailResult> => {
  const skipped = unconfigured(`Booking requested ${input.to}\n${input.manageUrl}`)
  if (skipped) return skipped

  return sendExternalMail({
    to: input.to,
    subject: requestedSubject,
    text:
      `Hi ${input.firstName},\n\n` +
      `We have sent your ${input.serviceName} request to ${input.providerName} for:\n\n` +
      `${input.when}\n\n` +
      `The time is held for you while they review it, and you will get an email as soon ` +
      `as they respond. You can view or cancel the request here:\n\n${input.manageUrl}\n`,
    html:
      `<p>Hi ${escapeHtml(input.firstName)},</p>` +
      `<p>We have sent your ${escapeHtml(input.serviceName)} request to ` +
      `${escapeHtml(input.providerName)} for:</p>` +
      `<p><strong>${escapeHtml(input.when)}</strong></p>` +
      `<p>The time is held for you while they review it, and you will get an email as soon ` +
      `as they respond.</p>` +
      `<p><a href="${input.manageUrl}">View or cancel the request</a></p>`,
  })
}

const approvedSubject = 'Your booking is confirmed'

export const sendBookingApprovedEmail = async (input: BookingNotice): Promise<MailResult> => {
  const skipped = unconfigured(`Booking approved ${input.to}\n${input.manageUrl}`)
  if (skipped) return skipped

  return sendExternalMail({
    to: input.to,
    subject: approvedSubject,
    text:
      `Hi ${input.firstName},\n\n` +
      `${input.providerName} has confirmed your ${input.serviceName} appointment:\n\n` +
      `${input.when}\n\n` +
      `Open this link to view, cancel, or change the time:\n\n${input.manageUrl}\n`,
    html:
      `<p>Hi ${escapeHtml(input.firstName)},</p>` +
      `<p>${escapeHtml(input.providerName)} has confirmed your ` +
      `${escapeHtml(input.serviceName)} appointment:</p>` +
      `<p><strong>${escapeHtml(input.when)}</strong></p>` +
      `<p><a href="${input.manageUrl}">View, cancel, or change the time</a></p>`,
  })
}

const rejectedSubject = 'Your booking could not be confirmed'

/**
 * `bookingUrl` rather than a manage link: the row is cancelled, so there is nothing left
 * to manage. What this reader needs is a way back to the provider's page to pick another
 * time, which is also why no reason is included — the provider is not asked for one, and
 * inventing "unavailable" would state something nobody said.
 */
export const sendBookingRejectedEmail = async (
  input: Omit<BookingNotice, 'manageUrl'> & { bookingUrl: string }
): Promise<MailResult> => {
  const skipped = unconfigured(`Booking rejected ${input.to}\n${input.bookingUrl}`)
  if (skipped) return skipped

  return sendExternalMail({
    to: input.to,
    subject: rejectedSubject,
    text:
      `Hi ${input.firstName},\n\n` +
      `${input.providerName} is not able to take your ${input.serviceName} appointment on:\n\n` +
      `${input.when}\n\n` +
      `The time has been released and you have not been charged. You can choose another ` +
      `time here:\n\n${input.bookingUrl}\n`,
    html:
      `<p>Hi ${escapeHtml(input.firstName)},</p>` +
      `<p>${escapeHtml(input.providerName)} is not able to take your ` +
      `${escapeHtml(input.serviceName)} appointment on:</p>` +
      `<p><strong>${escapeHtml(input.when)}</strong></p>` +
      `<p>The time has been released and you have not been charged.</p>` +
      `<p><a href="${input.bookingUrl}">Choose another time</a></p>`,
  })
}

const approvalRequestSubject = 'A booking is waiting for your approval'

/**
 * The provider's side, and the only one of the four that is not merely informational —
 * nothing happens until it is acted on.
 *
 * It is therefore **not** gated on `emailNotificationPrefs.newBooking`. That preference
 * turns off a notice about something already settled; turning this off would leave a
 * client waiting on a decision their provider was never told to make.
 */
export const sendBookingApprovalRequestEmail = async (input: {
  to: string
  providerFirstName: string
  bookerName: string
  serviceName: string
  when: string
  approvalsUrl: string
}): Promise<MailResult> => {
  const skipped = unconfigured(`Booking approval request ${input.to}\n${input.approvalsUrl}`)
  if (skipped) return skipped

  return sendExternalMail({
    to: input.to,
    subject: approvalRequestSubject,
    text:
      `Hi ${input.providerFirstName},\n\n` +
      `${input.bookerName} has requested a ${input.serviceName} appointment:\n\n` +
      `${input.when}\n\n` +
      `The slot is held until you decide. Approve or decline it here:\n\n${input.approvalsUrl}\n`,
    html:
      `<p>Hi ${escapeHtml(input.providerFirstName)},</p>` +
      `<p>${escapeHtml(input.bookerName)} has requested a ` +
      `${escapeHtml(input.serviceName)} appointment:</p>` +
      `<p><strong>${escapeHtml(input.when)}</strong></p>` +
      `<p>The slot is held until you decide.</p>` +
      `<p><a href="${input.approvalsUrl}">Approve or decline this booking</a></p>`,
  })
}

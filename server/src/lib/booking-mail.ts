import { escapeHtml, isMailConfigured, type MailResult, sendExternalMail } from './mail.js'
import { config } from '../config.js'

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

const bookingSubject = 'Your booking is confirmed'

const bookingText = (input: { firstName: string; providerName: string; manageUrl: string }): string =>
  `Hi ${input.firstName},\n\n` +
  `Your booking with ${input.providerName} is confirmed. Open this link to view, cancel, or change the time:\n\n` +
  `${input.manageUrl}\n\n` +
  `If you did not make this booking, you can ignore this email.`

const bookingHtml = (input: { firstName: string; providerName: string; manageUrl: string }): string =>
  `<p>Hi ${escapeHtml(input.firstName)},</p>` +
  `<p>Your booking with ${escapeHtml(input.providerName)} is confirmed.</p>` +
  // `manageUrl` is built by `buildBookingManageUrl` from our origin, an allowlisted
  // locale, and a hex token we minted — no request-body text reaches this href.
  `<p><a href="${input.manageUrl}">View, cancel, or change the time</a></p>` +
  `<p>If you did not make this booking, you can ignore this email.</p>`

export const sendBookingConfirmationEmail = async (input: {
  to: string
  firstName: string
  providerName: string
  manageUrl: string
}): Promise<MailResult> => {
  if (!isMailConfigured()) {
    if (config.nodeEnv === 'production') {
      return { ok: false, status: 0, message: 'Mail engine is not configured' }
    }
    logBookingLink(input.to, input.manageUrl)
    return { ok: true }
  }

  const result = await sendExternalMail({
    to: input.to,
    subject: bookingSubject,
    text: bookingText(input),
    html: bookingHtml(input),
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

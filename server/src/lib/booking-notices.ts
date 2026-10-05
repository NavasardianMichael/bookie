import type { Notice } from './notice-render.js'

/**
 * The words of every booking notification, as channel-neutral `Notice`s
 * (`lib/notice-render.ts`). Pure: the facts and links come in, nothing is fetched or sent.
 *
 * English, like every email this API sends — neither profile has a locale column yet
 * (docs/BACKLOG.md). The four messages that predate Telegram (confirmation, request,
 * approval, rejection, reschedule) keep their emails in `booking-mail.ts`; their entries here
 * are what the same moment reads like on Telegram, worded to match.
 */
export type BookingFacts = {
  bookerName: string
  bookerFirstName: string
  providerName: string
  providerFirstName: string
  serviceName: string
  /** Already formatted, in the provider's time zone (`formatBookingWhen`). */
  when: string
}

const hi = (name: string): string => `Hi ${name},`

/* --- To the provider ------------------------------------------------------- */

export const newBookingNotice = (facts: BookingFacts, bookingsUrl: string): Notice => ({
  subject: `New booking: ${facts.serviceName}`,
  greeting: hi(facts.providerFirstName),
  paragraphs: [`${facts.bookerName} booked a ${facts.serviceName} appointment with you:`, { strong: facts.when }],
  link: { url: bookingsUrl, label: 'See your bookings' },
})

export const approvalRequestNotice = (facts: BookingFacts, approvalsUrl: string): Notice => ({
  subject: 'A booking is waiting for your approval',
  greeting: hi(facts.providerFirstName),
  paragraphs: [
    `${facts.bookerName} has requested a ${facts.serviceName} appointment:`,
    { strong: facts.when },
    'The slot is held until you decide.',
  ],
  link: { url: approvalsUrl, label: 'Approve or decline this booking' },
})

export const rescheduledForProviderNotice = (facts: BookingFacts, bookingsUrl: string): Notice => ({
  subject: 'A booking has been changed',
  greeting: hi(facts.providerFirstName),
  paragraphs: [
    `${facts.bookerName} has changed their ${facts.serviceName} appointment to:`,
    { strong: facts.when },
    'The new time is now on your calendar.',
  ],
  link: { url: bookingsUrl, label: 'See your bookings' },
})

export const cancelledForProviderNotice = (facts: BookingFacts, bookingsUrl: string): Notice => ({
  subject: 'A booking has been cancelled',
  greeting: hi(facts.providerFirstName),
  paragraphs: [
    `${facts.bookerName} has cancelled their ${facts.serviceName} appointment on:`,
    { strong: facts.when },
    'The time is free again on your calendar.',
  ],
  link: { url: bookingsUrl, label: 'See your bookings' },
})

export const reminderForProviderNotice = (facts: BookingFacts, bookingsUrl: string): Notice => ({
  subject: `Reminder: ${facts.serviceName} with ${facts.bookerName}`,
  greeting: hi(facts.providerFirstName),
  paragraphs: [`Your ${facts.serviceName} appointment with ${facts.bookerName} is coming up:`, { strong: facts.when }],
  link: { url: bookingsUrl, label: 'See your bookings' },
})

/* --- To the person who booked ---------------------------------------------- */

const MANAGE_LABEL = 'View, cancel, or change the time'

export const confirmedForBookerNotice = (facts: BookingFacts, manageUrl: string): Notice => ({
  subject: 'Your booking is confirmed',
  greeting: hi(facts.bookerFirstName),
  paragraphs: [`Your ${facts.serviceName} booking with ${facts.providerName} is confirmed for:`, { strong: facts.when }],
  link: { url: manageUrl, label: MANAGE_LABEL },
})

export const requestedForBookerNotice = (facts: BookingFacts, manageUrl: string): Notice => ({
  subject: 'We have your booking request',
  greeting: hi(facts.bookerFirstName),
  paragraphs: [
    `We have sent your ${facts.serviceName} request to ${facts.providerName} for:`,
    { strong: facts.when },
    'The time is held for you while they review it, and you will hear as soon as they respond.',
  ],
  link: { url: manageUrl, label: 'View or cancel the request' },
})

export const approvedForBookerNotice = (facts: BookingFacts, manageUrl: string): Notice => ({
  subject: 'Your booking is confirmed',
  greeting: hi(facts.bookerFirstName),
  paragraphs: [`${facts.providerName} has confirmed your ${facts.serviceName} appointment:`, { strong: facts.when }],
  link: { url: manageUrl, label: MANAGE_LABEL },
})

export const rejectedForBookerNotice = (facts: BookingFacts, bookingUrl: string): Notice => ({
  subject: 'Your booking could not be confirmed',
  greeting: hi(facts.bookerFirstName),
  paragraphs: [
    `${facts.providerName} is not able to take your ${facts.serviceName} appointment on:`,
    { strong: facts.when },
    'The time has been released and you have not been charged.',
  ],
  link: { url: bookingUrl, label: 'Choose another time' },
})

export const rescheduledForBookerNotice = (facts: BookingFacts, manageUrl: string): Notice => ({
  subject: 'Your booking has been updated',
  greeting: hi(facts.bookerFirstName),
  paragraphs: [`Your booking with ${facts.providerName} has been moved to:`, { strong: facts.when }],
  link: { url: manageUrl, label: MANAGE_LABEL },
})

export const cancelledForBookerNotice = (facts: BookingFacts, bookingUrl: string): Notice => ({
  subject: 'Your booking has been cancelled',
  greeting: hi(facts.bookerFirstName),
  paragraphs: [
    `${facts.providerName} has cancelled your ${facts.serviceName} appointment on:`,
    { strong: facts.when },
    'You can choose another time on their page.',
  ],
  link: { url: bookingUrl, label: 'Choose another time' },
})

export const reminderForBookerNotice = (facts: BookingFacts, manageUrl: string): Notice => ({
  subject: `Reminder: your ${facts.serviceName} appointment`,
  greeting: hi(facts.bookerFirstName),
  paragraphs: [`Your ${facts.serviceName} appointment with ${facts.providerName} is coming up:`, { strong: facts.when }],
  link: { url: manageUrl, label: MANAGE_LABEL },
})

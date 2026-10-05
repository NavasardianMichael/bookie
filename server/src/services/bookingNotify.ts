import type { Recipient } from './noticeRules.js'
import { deliver } from './notify.js'
import { getEntitlements } from './plans.js'
import type { ReminderSide } from './reminders.js'
import { config } from '../config.js'
import { buildBookingManageUrl, formatBookingWhen } from '../lib/booking-mail.js'
import {
  approvalRequestNotice,
  approvedForBookerNotice,
  type BookingFacts,
  cancelledForBookerNotice,
  cancelledForProviderNotice,
  confirmedForBookerNotice,
  newBookingNotice,
  rejectedForBookerNotice,
  reminderForBookerNotice,
  reminderForProviderNotice,
  requestedForBookerNotice,
  rescheduledForBookerNotice,
  rescheduledForProviderNotice,
} from '../lib/booking-notices.js'
import { defaultConsumerNotificationPrefs, mergeConsumerNotificationPrefs, mergeProviderNotificationPrefs } from '../lib/notification-prefs.js'
import { prisma } from '../lib/prisma.js'
import { buildApprovalsUrl, buildBookingsUrl, buildProviderPageUrl } from '../lib/return-path.js'
import { mintOwnerManageToken } from '../lib/token.js'

/**
 * Every booking notification after the fact — who is told what, on which channel — with the
 * row read once per event (docs/NOTIFICATIONS.md).
 *
 * Each function is best-effort and never throws: the booking is already committed by the
 * time it runs, and a failed notice must not fail the request that caused it. Callers fire
 * them without awaiting where the response should not wait.
 *
 * The booker's manage link is the **owner token** (`mintOwnerManageToken`), not the emailed
 * one, whose raw value is never stored — the same choice the approval emails make.
 */

const partiesSelect = {
  id: true,
  startAt: true,
  providerId: true,
  guestEmail: true,
  guestFirstName: true,
  guestLastName: true,
  service: { select: { name: true } },
  consumer: {
    select: {
      firstName: true,
      lastName: true,
      emailNotificationPrefs: true,
      user: { select: { email: true, telegramChatId: true } },
    },
  },
  provider: {
    select: {
      firstName: true,
      lastName: true,
      timeZone: true,
      timeFormat: true,
      plan: true,
      planExpiresAt: true,
      emailNotificationPrefs: true,
      user: { select: { email: true, telegramChatId: true } },
    },
  },
} as const

type Parties = {
  facts: BookingFacts
  provider: Recipient
  booker: Recipient
  providerId: string
  appointmentId: string
}

const loadParties = async (appointmentId: string): Promise<Parties | null> => {
  const row = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: partiesSelect })
  if (!row) return null

  const bookerName =
    [row.guestFirstName, row.guestLastName].filter(Boolean).join(' ') ||
    [row.consumer?.firstName, row.consumer?.lastName].filter(Boolean).join(' ') ||
    'A client'

  return {
    appointmentId: row.id,
    providerId: row.providerId,
    facts: {
      bookerName,
      bookerFirstName: row.guestFirstName ?? row.consumer?.firstName ?? 'there',
      providerName: `${row.provider.firstName} ${row.provider.lastName}`.trim() || 'your provider',
      providerFirstName: row.provider.firstName,
      serviceName: row.service.name,
      when: formatBookingWhen(row.startAt, row.provider.timeZone, row.provider.timeFormat),
    },
    provider: {
      email: row.provider.user.email,
      telegramChatId: row.provider.user.telegramChatId,
      prefs: mergeProviderNotificationPrefs(row.provider.emailNotificationPrefs),
      // The one plan-gated channel: a provider's own Telegram (`telegramNotifications`).
      telegramAllowed: getEntitlements(row.provider, new Date()).telegramNotifications,
    },
    booker: row.consumer
      ? {
          email: row.consumer.user.email,
          telegramChatId: row.consumer.user.telegramChatId,
          prefs: mergeConsumerNotificationPrefs(row.consumer.emailNotificationPrefs),
          // Clients never pay, so a client's Telegram is never gated by anyone's plan.
          telegramAllowed: true,
        }
      : {
          // A guest has no settings and no Telegram — email, with every default on.
          email: row.guestEmail ?? undefined,
          prefs: defaultConsumerNotificationPrefs,
          telegramAllowed: false,
        },
  }
}

const manageUrl = (parties: Parties, locale: string): string =>
  buildBookingManageUrl(config.corsOrigin, locale, mintOwnerManageToken(parties.appointmentId, config.jwtSecret))

const bookingsUrl = (locale: string): string => buildBookingsUrl(config.corsOrigin, locale)

const providerPageUrl = (parties: Parties, locale: string): string =>
  buildProviderPageUrl(config.corsOrigin, locale, parties.providerId)

/** Runs a notifier and logs instead of throwing — the shape every export below shares. */
const safely = async (label: string, run: () => Promise<void>): Promise<void> => {
  try {
    await run()
  } catch (error) {
    console.error(`[notify] ${label} failed`, error)
  }
}

/**
 * A booking was just made. The booker's email and, when approval is on, the provider's
 * approval-request email are sent by `POST /appointments` itself (`booking-mail.ts`), which
 * reports `emailSent`. What is added here:
 *
 * - **No approval needed:** the provider's new-booking notice, email and Telegram, silenced
 *   by `newBooking`.
 * - **Approval needed:** the approval request on Telegram — never silenced, like its email.
 * - The booker's confirmation on Telegram, for a client who linked one.
 */
export const notifyBookingCreated = (appointmentId: string, locale: string, requiresApproval: boolean): Promise<void> =>
  safely('booking created', async () => {
    const parties = await loadParties(appointmentId)
    if (!parties) return

    if (requiresApproval) {
      await deliver(
        parties.provider,
        'always',
        approvalRequestNotice(parties.facts, buildApprovalsUrl(config.corsOrigin, locale)),
        'approval request',
        { email: false }
      )
    } else {
      await deliver(parties.provider, 'newBooking', newBookingNotice(parties.facts, bookingsUrl(locale)), 'new booking')
    }

    const bookerNotice = requiresApproval
      ? requestedForBookerNotice(parties.facts, manageUrl(parties, locale))
      : confirmedForBookerNotice(parties.facts, manageUrl(parties, locale))
    await deliver(parties.booker, 'always', bookerNotice, 'booking receipt', { email: false })
  })

/**
 * The booker moved the booking. Each side's email (`booking-mail.ts`'s reschedule senders,
 * sent by the caller) and Telegram are both silenced by that side's `bookingChanges` — the
 * caller asks `wantsRescheduleEmail` before sending the email.
 */
export const notifyBookingRescheduledTelegram = (appointmentId: string, locale: string): Promise<void> =>
  safely('booking rescheduled', async () => {
    const parties = await loadParties(appointmentId)
    if (!parties) return
    await deliver(
      parties.booker,
      'bookingChanges',
      rescheduledForBookerNotice(parties.facts, manageUrl(parties, locale)),
      'reschedule',
      { email: false }
    )
    await deliver(
      parties.provider,
      'bookingChanges',
      rescheduledForProviderNotice(parties.facts, bookingsUrl(locale)),
      'reschedule',
      { email: false }
    )
  })

/**
 * Who of the two still wants a reschedule email, by their `bookingChanges`. Read here rather
 * than in the route so the preference has one reader.
 */
export const rescheduleEmailWanted = async (appointmentId: string): Promise<{ booker: boolean; provider: boolean }> => {
  const parties = await loadParties(appointmentId)
  if (!parties) return { booker: false, provider: false }
  return { booker: parties.booker.prefs.bookingChanges, provider: parties.provider.prefs.bookingChanges }
}

/**
 * A booking was cancelled — told to **the other side** only: the person who cancelled knows.
 * Silenced by the recipient's `bookingChanges`.
 */
export const notifyBookingCancelled = (appointmentId: string, cancelledBy: 'booker' | 'provider', locale: string): Promise<void> =>
  safely('booking cancelled', async () => {
    const parties = await loadParties(appointmentId)
    if (!parties) return

    if (cancelledBy === 'booker') {
      await deliver(parties.provider, 'bookingChanges', cancelledForProviderNotice(parties.facts, bookingsUrl(locale)), 'cancellation')
      return
    }
    await deliver(
      parties.booker,
      'bookingChanges',
      cancelledForBookerNotice(parties.facts, providerPageUrl(parties, locale)),
      'cancellation'
    )
  })

/** The provider's decision, on the booker's Telegram — its email is sent by the decision route. */
export const notifyBookingDecisionTelegram = (
  appointmentId: string,
  decision: 'approve' | 'reject',
  locale: string
): Promise<void> =>
  safely('booking decision', async () => {
    const parties = await loadParties(appointmentId)
    if (!parties) return
    const notice =
      decision === 'approve'
        ? approvedForBookerNotice(parties.facts, manageUrl(parties, locale))
        : rejectedForBookerNotice(parties.facts, providerPageUrl(parties, locale))
    await deliver(parties.booker, 'always', notice, 'booking decision', { email: false })
  })

/**
 * One side's appointment reminder, email and Telegram. Called by `jobs/reminderJob.ts` once
 * it has claimed the send; whether it is due was decided there (`services/reminders.ts`).
 * Links use the default locale — neither profile stores one.
 */
export const sendAppointmentReminder = (appointmentId: string, side: ReminderSide): Promise<void> =>
  safely('reminder', async () => {
    const parties = await loadParties(appointmentId)
    if (!parties) return
    const locale = 'en'
    if (side === 'provider') {
      await deliver(parties.provider, 'reminder', reminderForProviderNotice(parties.facts, bookingsUrl(locale)), 'reminder')
      return
    }
    await deliver(parties.booker, 'reminder', reminderForBookerNotice(parties.facts, manageUrl(parties, locale)), 'reminder')
  })

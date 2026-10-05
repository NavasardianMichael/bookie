import { mergeConsumerNotificationPrefs, mergeProviderNotificationPrefs } from '../lib/notification-prefs.js'
import { prisma } from '../lib/prisma.js'
import { sendAppointmentReminder } from '../services/bookingNotify.js'
import {
  GUEST_REMINDER_LEAD_MINUTES,
  MAX_REMINDER_LEAD_MINUTES,
  REMINDABLE_STATUSES,
  type ReminderSide,
  reminderState,
} from '../services/reminders.js'

/**
 * The appointment-reminder sender — **the API's one background job** (docs/NOTIFICATIONS.md).
 *
 * Everything else here is computed on read, and plan expiry still is: a reminder is the one
 * thing that has to *happen* at a time nobody is making a request. It runs inside the API
 * process rather than as a second service, keeping deploys to one unit.
 *
 * Every minute it reads live bookings starting within the longest lead time anyone can pick
 * and, for each side that is due (`services/reminders.ts`), **claims the send by
 * compare-and-set** on that side's stamp before sending — the `claimCapNotice` pattern. A
 * side that will never be due (its preference off, or booked inside its own window) is
 * stamped without a send, so the sweep only ever re-reads what is still to come. So a
 * reminder goes out at most once even if a second process ever polls too, and a send that
 * fails after its claim is not retried: a late duplicate is worse than one missed reminder.
 *
 * Started by `index.ts`, never by `createApp`, so tests and scripts never start it.
 */

const SWEEP_INTERVAL_MS = 60 * 1000
/** Bounds one sweep; the next one a minute later picks up whatever is left. */
const SWEEP_BATCH = 200
const MINUTE_MS = 60 * 1000

const STAMP_FIELD: Record<ReminderSide, 'providerRemindedAt' | 'bookerRemindedAt'> = {
  provider: 'providerRemindedAt',
  booker: 'bookerRemindedAt',
}

const claim = async (appointmentId: string, side: ReminderSide, now: Date): Promise<boolean> => {
  const field = STAMP_FIELD[side]
  const { count } = await prisma.appointment.updateMany({
    where: { id: appointmentId, [field]: null },
    data: { [field]: now },
  })
  return count === 1
}

export const runReminderSweep = async (now: Date): Promise<number> => {
  const rows = await prisma.appointment.findMany({
    where: {
      status: { in: [...REMINDABLE_STATUSES] },
      startAt: { gt: now, lte: new Date(now.getTime() + MAX_REMINDER_LEAD_MINUTES * MINUTE_MS) },
      OR: [{ providerRemindedAt: null }, { bookerRemindedAt: null }],
    },
    select: {
      id: true,
      status: true,
      startAt: true,
      createdAt: true,
      providerRemindedAt: true,
      bookerRemindedAt: true,
      consumerId: true,
      provider: { select: { emailNotificationPrefs: true } },
      consumer: { select: { emailNotificationPrefs: true } },
    },
    orderBy: { startAt: 'asc' },
    take: SWEEP_BATCH,
  })

  let sent = 0
  for (const row of rows) {
    const providerPrefs = mergeProviderNotificationPrefs(row.provider.emailNotificationPrefs)
    const bookerPrefs = row.consumer ? mergeConsumerNotificationPrefs(row.consumer.emailNotificationPrefs) : null

    const preference: Record<ReminderSide, { enabled: boolean; leadMinutes: number }> = {
      provider: { enabled: providerPrefs.appointmentReminders, leadMinutes: providerPrefs.appointmentReminderMinutes },
      booker: bookerPrefs
        ? { enabled: bookerPrefs.appointmentReminders, leadMinutes: bookerPrefs.appointmentReminderMinutes }
        : { enabled: true, leadMinutes: GUEST_REMINDER_LEAD_MINUTES },
    }

    for (const side of ['provider', 'booker'] as const) {
      const state = reminderState(row, side, preference[side], now)
      if (state === 'done' || state === 'later') continue
      if (!(await claim(row.id, side, now))) continue
      // A side that will never be reminded is stamped without sending, so it stops
      // coming back in every sweep and crowding out the ones that are due.
      if (state === 'never') continue
      await sendAppointmentReminder(row.id, side)
      sent += 1
    }
  }
  return sent
}

/** Starts the sweep; returns a stop function. One sweep at a time — a slow one is not overlapped. */
export const startReminderJob = (): (() => void) => {
  let running = false

  const tick = async (): Promise<void> => {
    if (running) return
    running = true
    try {
      const sent = await runReminderSweep(new Date())
      if (sent) console.info(`[reminders] sent ${sent}`)
    } catch (error) {
      console.error('[reminders] sweep failed', error)
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => void tick(), SWEEP_INTERVAL_MS)
  // Never the reason the process stays alive.
  timer.unref()
  void tick()

  return () => clearInterval(timer)
}

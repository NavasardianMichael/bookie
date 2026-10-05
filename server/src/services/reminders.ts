import type { AppointmentStatus } from '@prisma/client'
import { DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES } from '../lib/notification-prefs.js'

/**
 * When an appointment reminder is due — pure, `now` injected, so
 * `tests/unit/server/reminders.spec.ts` reaches every rule. `jobs/reminderJob.ts` polls,
 * claims and sends; nothing here touches the database.
 *
 * Each side of a booking is reminded on its own schedule: the provider at their
 * `appointmentReminderMinutes`, a signed-in client at theirs, a guest — who has no settings —
 * at the default 24 hours.
 */

/** Only bookings on the calendar. A pending request is not one yet; a cancelled one never will be. */
export const REMINDABLE_STATUSES = ['scheduled', 'confirmed'] as const satisfies readonly AppointmentStatus[]

/** A guest booking has no preferences to read, so the booker gets the default lead time. */
export const GUEST_REMINDER_LEAD_MINUTES = DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES

/** The longest lead time anyone can choose — how far ahead the job has to look. */
export const MAX_REMINDER_LEAD_MINUTES = 1440

export type ReminderSide = 'provider' | 'booker'

export type ReminderCandidate = {
  status: AppointmentStatus
  startAt: Date
  createdAt: Date
  providerRemindedAt: Date | null
  bookerRemindedAt: Date | null
}

const MINUTE_MS = 60 * 1000

/**
 * Where one side's reminder stands:
 *
 * - `due` — the reminder moment (`startAt − lead`) has come and the appointment has not
 *   started: send it now.
 * - `later` — not yet.
 * - `never` — it will not be sent: the preference is off, the appointment has started, or the
 *   booking was **made inside its own reminder window** (someone who booked for two hours
 *   from now does not need a 24-hour reminder the minute after their confirmation). The job
 *   stamps these without sending, so they stop coming back in every sweep.
 * - `done` — already stamped.
 */
export type ReminderState = 'due' | 'later' | 'never' | 'done'

export const reminderState = (
  appointment: ReminderCandidate,
  side: ReminderSide,
  preference: { enabled: boolean; leadMinutes: number },
  now: Date
): ReminderState => {
  const stamp = side === 'provider' ? appointment.providerRemindedAt : appointment.bookerRemindedAt
  if (stamp !== null) return 'done'
  if (!preference.enabled) return 'never'
  if (!(REMINDABLE_STATUSES as readonly AppointmentStatus[]).includes(appointment.status)) return 'never'
  if (appointment.startAt <= now) return 'never'

  const remindAt = new Date(appointment.startAt.getTime() - preference.leadMinutes * MINUTE_MS)
  if (appointment.createdAt > remindAt) return 'never'
  return remindAt <= now ? 'due' : 'later'
}

export const isReminderDue = (
  appointment: ReminderCandidate,
  side: ReminderSide,
  preference: { enabled: boolean; leadMinutes: number },
  now: Date
): boolean => reminderState(appointment, side, preference, now) === 'due'

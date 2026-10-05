import { describe, expect, it } from 'vitest'
import { isReminderDue, type ReminderCandidate, reminderState } from '../../../server/src/services/reminders'

const NOW = new Date('2026-10-04T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000
const at = (hoursFromNow: number): Date => new Date(NOW.getTime() + hoursFromNow * HOUR_MS)

const booking = (overrides: Partial<ReminderCandidate> = {}): ReminderCandidate => ({
  status: 'scheduled',
  startAt: at(20),
  createdAt: at(-72),
  providerRemindedAt: null,
  bookerRemindedAt: null,
  ...overrides,
})

const DAY_BEFORE = { enabled: true, leadMinutes: 1440 }
const HOUR_BEFORE = { enabled: true, leadMinutes: 60 }

describe('isReminderDue', () => {
  it('is due once the lead time has been reached', () => {
    expect(isReminderDue(booking(), 'booker', DAY_BEFORE, NOW)).toBe(true)
  })

  it('is not due before the lead time', () => {
    expect(isReminderDue(booking(), 'provider', HOUR_BEFORE, NOW)).toBe(false)
    expect(isReminderDue(booking({ startAt: at(0.5) }), 'provider', HOUR_BEFORE, NOW)).toBe(true)
  })

  it('goes once per side', () => {
    expect(isReminderDue(booking({ bookerRemindedAt: at(-1) }), 'booker', DAY_BEFORE, NOW)).toBe(false)
    expect(isReminderDue(booking({ bookerRemindedAt: at(-1) }), 'provider', DAY_BEFORE, NOW)).toBe(true)
  })

  it('respects the preference being off', () => {
    expect(isReminderDue(booking(), 'booker', { enabled: false, leadMinutes: 1440 }, NOW)).toBe(false)
  })

  // Booked two hours ahead: a 24-hour reminder the minute after the confirmation is noise.
  it('skips a booking made inside its own reminder window', () => {
    expect(isReminderDue(booking({ startAt: at(2), createdAt: at(-0.1) }), 'booker', DAY_BEFORE, NOW)).toBe(false)
  })

  it('never reminds of something that has started', () => {
    expect(isReminderDue(booking({ startAt: at(-0.1) }), 'booker', DAY_BEFORE, NOW)).toBe(false)
  })

  it.each(['pending', 'cancelled', 'completed', 'no_show'] as const)('never reminds of a %s booking', (status) => {
    expect(isReminderDue(booking({ status }), 'booker', DAY_BEFORE, NOW)).toBe(false)
  })

  it('reminds of a confirmed booking', () => {
    expect(isReminderDue(booking({ status: 'confirmed' }), 'provider', DAY_BEFORE, NOW)).toBe(true)
  })
})

describe('reminderState', () => {
  // The job stamps `never` without sending, so these stop coming back in every sweep.
  it('marks a side that will never be reminded', () => {
    expect(reminderState(booking(), 'provider', { enabled: false, leadMinutes: 60 }, NOW)).toBe('never')
    expect(reminderState(booking({ startAt: at(2), createdAt: at(-0.1) }), 'booker', DAY_BEFORE, NOW)).toBe('never')
  })

  it('tells a reminder still to come from one already sent', () => {
    expect(reminderState(booking(), 'provider', HOUR_BEFORE, NOW)).toBe('later')
    expect(reminderState(booking({ providerRemindedAt: at(-1) }), 'provider', HOUR_BEFORE, NOW)).toBe('done')
  })
})


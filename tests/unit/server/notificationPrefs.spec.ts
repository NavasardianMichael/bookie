import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
  mergeConsumerNotificationPrefs,
  mergeProviderNotificationPrefs,
} from '../../../server/src/lib/notification-prefs'

describe('mergeProviderNotificationPrefs', () => {
  it('fills defaults for an empty column', () => {
    expect(mergeProviderNotificationPrefs({})).toEqual({
      appointmentReminders: true,
      appointmentReminderMinutes: DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
      bookingChanges: true,
      newBooking: true,
    })
  })

  it('keeps a valid lead time and booleans', () => {
    expect(
      mergeProviderNotificationPrefs({
        appointmentReminders: false,
        appointmentReminderMinutes: 15,
        bookingChanges: false,
        newBooking: false,
      })
    ).toEqual({
      appointmentReminders: false,
      appointmentReminderMinutes: 15,
      bookingChanges: false,
      newBooking: false,
    })
  })

  it('rejects a lead time that is not one of the four options', () => {
    expect(mergeProviderNotificationPrefs({ appointmentReminderMinutes: 7 }).appointmentReminderMinutes).toBe(
      DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES
    )
  })
})

describe('mergeConsumerNotificationPrefs', () => {
  it('fills defaults and drops a leftover marketing flag', () => {
    expect(mergeConsumerNotificationPrefs({ marketing: true })).toEqual({
      appointmentReminders: true,
      appointmentReminderMinutes: DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
      bookingChanges: true,
    })
  })
})

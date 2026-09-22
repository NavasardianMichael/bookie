import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES,
  toAppointmentReminderLeadMinutes,
} from '@constants/settings'

describe('toAppointmentReminderLeadMinutes', () => {
  it('keeps an offered lead time', () => {
    expect(toAppointmentReminderLeadMinutes(15)).toBe(15)
    expect(toAppointmentReminderLeadMinutes(60)).toBe(60)
    expect(toAppointmentReminderLeadMinutes(360)).toBe(360)
    expect(toAppointmentReminderLeadMinutes(1440)).toBe(1440)
  })

  it('falls back to 24 hours for anything else', () => {
    expect(toAppointmentReminderLeadMinutes(undefined)).toBe(DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES)
    expect(toAppointmentReminderLeadMinutes(7)).toBe(DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES)
    expect(toAppointmentReminderLeadMinutes('60')).toBe(DEFAULT_APPOINTMENT_REMINDER_LEAD_MINUTES)
  })
})

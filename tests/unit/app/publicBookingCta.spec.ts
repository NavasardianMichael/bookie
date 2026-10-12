import {
  BOOKING_CALENDAR_ID,
  BOOKING_SERVICES_ID,
  BOOKING_TIMES_ID,
  bookingContinueSection,
  bookingContinueTarget,
} from '@app/[lang]/providers/[providerId]/components/publicBookingCta'
import { describe, expect, it } from 'vitest'

const open = { hasService: false, hasDay: false, hasTime: false, cannotBookOwn: false }

describe('bookingContinueTarget', () => {
  it('asks for a service before a time, including when the only open time is already selected', () => {
    expect(bookingContinueTarget({ ...open, hasTime: true, hasDay: true })).toBe('service')
    expect(bookingContinueTarget(open)).toBe('service')
  })

  it('skips a service that is already selected and asks for a day, then a time', () => {
    expect(bookingContinueTarget({ ...open, hasService: true })).toBe('calendar')
    expect(bookingContinueTarget({ ...open, hasService: true, hasDay: true })).toBe('time')
  })

  it('opens the sheet once the only service and the only open time are both selected', () => {
    expect(bookingContinueTarget({ ...open, hasService: true, hasDay: true, hasTime: true })).toBe('confirm')
  })

  it('sends the provider to the explanation instead of the sheet', () => {
    expect(
      bookingContinueTarget({ hasService: true, hasDay: true, hasTime: true, cannotBookOwn: true })
    ).toBe('ownPage')
  })
})

describe('bookingContinueSection', () => {
  it('scrolls to the step that is still empty', () => {
    expect(bookingContinueSection('service')).toBe(BOOKING_SERVICES_ID)
    expect(bookingContinueSection('calendar')).toBe(BOOKING_CALENDAR_ID)
    expect(bookingContinueSection('time')).toBe(BOOKING_TIMES_ID)
    expect(bookingContinueSection('ownPage')).toBe(BOOKING_TIMES_ID)
  })

  it('does not scroll when the sheet should open', () => {
    expect(bookingContinueSection('confirm')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { channelsFor, prefersNotice, type Recipient } from '../../../server/src/services/noticeRules'

const ALL_ON = { appointmentReminders: true, bookingChanges: true, newBooking: true }

const recipient = (overrides: Partial<Recipient> = {}): Recipient => ({
  email: 'anna@example.com',
  telegramChatId: '12345',
  prefs: ALL_ON,
  telegramAllowed: true,
  ...overrides,
})

describe('prefersNotice', () => {
  it('lets each preference silence its own kind', () => {
    expect(prefersNotice('reminder', { ...ALL_ON, appointmentReminders: false })).toBe(false)
    expect(prefersNotice('bookingChanges', { ...ALL_ON, bookingChanges: false })).toBe(false)
    expect(prefersNotice('newBooking', { ...ALL_ON, newBooking: false })).toBe(false)
  })

  // The approval request and the answer to one move a booking on; nothing silences them.
  it('never silences an `always` notice', () => {
    expect(prefersNotice('always', { appointmentReminders: false, bookingChanges: false, newBooking: false })).toBe(true)
  })

  it('treats a client, who has no newBooking preference, as wanting it', () => {
    expect(prefersNotice('newBooking', { appointmentReminders: true, bookingChanges: true })).toBe(true)
  })
})

describe('channelsFor', () => {
  it('sends on both channels when both are there and wanted', () => {
    expect(channelsFor('reminder', recipient())).toEqual({ email: true, telegram: true })
  })

  // A provider's Telegram is the plan-gated channel; their email never is.
  it('keeps email and drops Telegram when the plan does not allow it', () => {
    expect(channelsFor('newBooking', recipient({ telegramAllowed: false }))).toEqual({ email: true, telegram: false })
  })

  it('sends nowhere it has no address for', () => {
    expect(channelsFor('reminder', recipient({ email: undefined, telegramChatId: null }))).toEqual({
      email: false,
      telegram: false,
    })
  })

  it('silences both channels together', () => {
    expect(channelsFor('bookingChanges', recipient({ prefs: { ...ALL_ON, bookingChanges: false } }))).toEqual({
      email: false,
      telegram: false,
    })
  })
})

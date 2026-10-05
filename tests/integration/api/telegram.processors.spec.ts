import { describe, expect, it } from 'vitest'
import { processCalendarFeedResponse, processRotateCalendarFeedResponse } from '@api/calendar/processors'
import {
  processTelegramLinkResponse,
  processTelegramStatusResponse,
  processTelegramUnlinkResponse,
} from '@api/telegram/processors'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

describe('telegram processors', () => {
  it('passes the link status through', () => {
    const status = { available: true, linked: true, username: 'anna_p' }
    expect(processTelegramStatusResponse(envelope(status))).toEqual(status)
  })

  it('answers the Connect deep link itself', () => {
    expect(processTelegramLinkResponse(envelope({ url: 'https://t.me/BookieBot?start=abc' }))).toBe(
      'https://t.me/BookieBot?start=abc'
    )
  })

  it('answers whether the unlink went through', () => {
    expect(processTelegramUnlinkResponse(envelope(true))).toBe(true)
  })
})

describe('calendar feed processors', () => {
  it('answers the feed URL itself, before and after a reset', () => {
    const url = 'https://api.bookie.example/calendar/prov-1/abc.ics'
    expect(processCalendarFeedResponse(envelope({ url }))).toBe(url)
    expect(processRotateCalendarFeedResponse(envelope({ url }))).toBe(url)
  })
})

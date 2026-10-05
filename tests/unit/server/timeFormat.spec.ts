import { describe, expect, it } from 'vitest'
import { TIME_FORMATS as WEB_TIME_FORMATS } from '@constants/schedule'
import { getHourCycle } from '@helpers/timeFormat'
import { formatBookingWhen, hourCycleOf, TIME_FORMATS, toTimeFormat } from '../../../server/src/lib/time-format'

describe('toTimeFormat', () => {
  it('accepts the two clocks and refuses everything else', () => {
    expect(toTimeFormat('h12')).toBe('h12')
    expect(toTimeFormat('h24')).toBe('h24')
    expect(toTimeFormat('24h')).toBeNull()
    expect(toTimeFormat('H24')).toBeNull()
    expect(toTimeFormat('')).toBeNull()
    expect(toTimeFormat(undefined)).toBeNull()
    expect(toTimeFormat(24)).toBeNull()
  })
})

/**
 * The web reads the value the API writes, through a type of its own — the two packages
 * share none. A renamed value on one side typechecks on both and silently falls back to
 * the locale's clock everywhere.
 */
describe('twins', () => {
  it('agree on the values and on what each means to Intl', () => {
    expect(TIME_FORMATS).toEqual(WEB_TIME_FORMATS)
    TIME_FORMATS.forEach((format) => expect(hourCycleOf(format)).toBe(getHourCycle(format)))
    expect(hourCycleOf(null)).toBe(getHourCycle(null))
  })
})

describe('formatBookingWhen', () => {
  // 10:30 in Yerevan (GMT+4).
  const startAt = new Date('2026-03-04T06:30:00.000Z')

  it("prints the provider's zone on their chosen clock", () => {
    expect(formatBookingWhen(startAt, 'Asia/Yerevan', 'h24')).toMatch(/10:30 GMT\+4$/)
    expect(formatBookingWhen(startAt, 'Asia/Yerevan', 'h12')).toMatch(/10:30\sAM GMT\+4$/)
  })

  it('keeps the English 12-hour default for a provider who never chose', () => {
    expect(formatBookingWhen(new Date('2026-03-04T14:30:00.000Z'), 'UTC')).toMatch(/2:30\sPM UTC$/)
    expect(formatBookingWhen(new Date('2026-03-04T14:30:00.000Z'), 'UTC', 'h24')).toMatch(/14:30 UTC$/)
  })
})

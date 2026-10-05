import { describe, expect, it } from 'vitest'
import { SUPPORTED_TIME_ZONES, toTimeZone, weekdayInZone } from '../../../server/src/lib/time-zone'

/**
 * `Provider.timeZone` is stored canonical so that Explore's open-today filter can group
 * providers with `IN` lists of `SUPPORTED_TIME_ZONES`. Every accepted zone must therefore
 * come out of `toTimeZone` as a member of that list.
 */
describe('toTimeZone', () => {
  it('accepts a known zone and refuses everything else', () => {
    expect(toTimeZone('Asia/Yerevan')).toBe('Asia/Yerevan')
    expect(toTimeZone('Mars/Olympus')).toBeNull()
    expect(toTimeZone('')).toBeNull()
    expect(toTimeZone('   ')).toBeNull()
    expect(toTimeZone(undefined)).toBeNull()
    expect(toTimeZone(42)).toBeNull()
  })

  it('stores the canonical spelling, whatever alias the browser reported', () => {
    expect(toTimeZone('US/Eastern')).toBe('America/New_York')
    expect(toTimeZone('asia/yerevan')).toBe('Asia/Yerevan')
    expect(toTimeZone('Etc/UTC')).toBe('UTC')
  })

  it('only ever answers a zone the open-today filter can group by', () => {
    const browserSpellings = ['Asia/Kolkata', 'Europe/Kyiv', 'UTC', 'GMT', 'Europe/Berlin', 'America/Sao_Paulo']

    browserSpellings.forEach((zone) => {
      expect(SUPPORTED_TIME_ZONES).toContain(toTimeZone(zone))
    })
  })
})

describe('weekdayInZone', () => {
  it("names the provider's weekday, not the server's", () => {
    // Monday 22:00 UTC is already Tuesday in Yerevan and still Monday in New York.
    const lateMondayUtc = new Date('2026-09-07T22:00:00.000Z')

    expect(weekdayInZone(lateMondayUtc, 'UTC')).toBe('monday')
    expect(weekdayInZone(lateMondayUtc, 'Asia/Yerevan')).toBe('tuesday')
    expect(weekdayInZone(lateMondayUtc, 'America/New_York')).toBe('monday')
  })
})

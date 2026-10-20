import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { bookingPeriodRange } from '@helpers/bookingPeriod'

const at = (iso: string) => dayjs(iso)

describe('bookingPeriodRange', () => {
  const wednesday = at('2026-10-21T15:00:00.000Z')

  it('starts upcoming at the given instant, with no end', () => {
    expect(bookingPeriodRange('upcoming', wednesday)).toEqual({ from: '2026-10-21T15:00:00.000Z' })
  })

  it('covers today', () => {
    expect(bookingPeriodRange('today', wednesday)).toEqual({
      from: at('2026-10-21').startOf('day').toISOString(),
      to: at('2026-10-21').endOf('day').toISOString(),
    })
  })

  it('covers this Monday-first week, and treats Sunday as the end of that week', () => {
    const week = {
      from: at('2026-10-19').startOf('day').toISOString(),
      to: at('2026-10-25').endOf('day').toISOString(),
    }
    expect(bookingPeriodRange('thisWeek', wednesday)).toEqual(week)
    expect(bookingPeriodRange('thisWeek', at('2026-10-25T12:00:00.000Z'))).toEqual(week)
  })

  it('covers the following week and the previous week', () => {
    expect(bookingPeriodRange('nextWeek', wednesday)).toEqual({
      from: at('2026-10-26').startOf('day').toISOString(),
      to: at('2026-11-01').endOf('day').toISOString(),
    })
    expect(bookingPeriodRange('lastWeek', wednesday)).toEqual({
      from: at('2026-10-12').startOf('day').toISOString(),
      to: at('2026-10-18').endOf('day').toISOString(),
    })
  })

  it('covers this month and the previous month', () => {
    expect(bookingPeriodRange('thisMonth', wednesday)).toEqual({
      from: at('2026-10-01').startOf('day').toISOString(),
      to: at('2026-10-31').endOf('day').toISOString(),
    })
    expect(bookingPeriodRange('lastMonth', wednesday)).toEqual({
      from: at('2026-09-01').startOf('day').toISOString(),
      to: at('2026-09-30').endOf('day').toISOString(),
    })
  })
})

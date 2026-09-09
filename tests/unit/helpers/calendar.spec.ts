import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { buildMonthCells, WEEKDAY_ORDER } from '@helpers/calendar'

/**
 * The month-grid arithmetic shared by the public booking calendar and the provider's
 * booking history. Getting the leading offset wrong shifts every cell out of its weekday
 * column, which is the kind of bug that looks like a styling problem.
 */

describe('buildMonthCells', () => {
  it('always returns whole weeks, so the grid keeps its columns', () => {
    for (const month of ['2026-01', '2026-02', '2026-09', '2026-11', '2024-02']) {
      const cells = buildMonthCells(dayjs(`${month}-01`))
      expect(cells.length % 7, month).toBe(0)
    }
  })

  it('starts the grid on a Monday', () => {
    // September 2026 begins on a Tuesday, so the grid opens on Monday 31 August.
    const cells = buildMonthCells(dayjs('2026-09-15'))
    expect(cells[0]?.key).toBe('2026-08-31')
    expect(cells[0]?.date.day()).toBe(1)
  })

  it('needs no leading days when the month already begins on a Monday', () => {
    // June 2026 begins on a Monday.
    const cells = buildMonthCells(dayjs('2026-06-10'))
    expect(cells[0]?.key).toBe('2026-06-01')
    expect(cells[0]?.isOutside).toBe(false)
  })

  it('takes six rows when a 31-day month starts on a Sunday', () => {
    // March 2026 starts on a Sunday: six leading days plus 31 needs six rows.
    expect(buildMonthCells(dayjs('2026-03-01'))).toHaveLength(42)
  })

  it('takes four rows for a February that starts on a Monday', () => {
    // February 2027: 28 days beginning on a Monday fits exactly four weeks.
    expect(buildMonthCells(dayjs('2027-02-01'))).toHaveLength(28)
  })

  it('marks borrowed days as outside and the month’s own as inside', () => {
    const cells = buildMonthCells(dayjs('2026-09-15'))
    const inside = cells.filter((cell) => !cell.isOutside)

    expect(inside).toHaveLength(30)
    expect(inside[0]?.key).toBe('2026-09-01')
    expect(inside[inside.length - 1]?.key).toBe('2026-09-30')
    expect(cells[0]?.isOutside).toBe(true)
  })

  it('is the same grid whichever day of the month is passed in', () => {
    const first = buildMonthCells(dayjs('2026-09-01')).map((cell) => cell.key)
    const last = buildMonthCells(dayjs('2026-09-30')).map((cell) => cell.key)
    expect(first).toEqual(last)
  })

  it('runs consecutively with no gaps or repeats', () => {
    const cells = buildMonthCells(dayjs('2026-03-01'))
    for (let index = 1; index < cells.length; index += 1) {
      expect(cells[index]!.date.diff(cells[index - 1]!.date, 'day')).toBe(1)
    }
  })

  it('keys cells in DAY_KEY_FORMAT, the form days travel in', () => {
    for (const cell of buildMonthCells(dayjs('2026-09-15'))) {
      expect(cell.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('handles a leap February', () => {
    const inside = buildMonthCells(dayjs('2024-02-10')).filter((cell) => !cell.isOutside)
    expect(inside).toHaveLength(29)
  })
})

describe('WEEKDAY_ORDER', () => {
  it('is Monday-first in dayjs’s Sunday-first numbering', () => {
    // dayjs `day()` returns 0 for Sunday; the app is Monday-first everywhere.
    expect([...WEEKDAY_ORDER]).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})

import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import { SpecialDate } from '@store/providers/profile/types'
import { hoursChanges, serviceLosses } from '@helpers/scheduleChanges'

// 2026-03-02 is a Monday. Open Monday and Wednesday 09:00–17:00; closed otherwise.
const weekSchedule = makeWeekSchedule({ monday: day('09:00', '17:00'), wednesday: day('09:00', '17:00') })
const TODAY = '2026-03-02'
const holiday: SpecialDate = { from: '2026-03-09', to: '2026-03-09', kind: 'closed', hours: null, note: 'Holiday' }

describe('hoursChanges', () => {
  it('names each weekday whose hours change, before and after', () => {
    const after = { weekSchedule: makeWeekSchedule({ monday: day('09:00', '17:00'), wednesday: day('09:00', '12:00') }) }
    expect(hoursChanges({ weekSchedule }, after, TODAY)).toEqual([
      {
        kind: 'weekday',
        day: 'wednesday',
        before: [{ start: '09:00', end: '17:00' }],
        after: [{ start: '09:00', end: '12:00' }],
      },
    ])
  })

  it('names special dates added, changed and removed, soonest first, and ignores past ones', () => {
    const past: SpecialDate = { from: '2026-02-01', to: '2026-02-01', kind: 'closed', hours: null }
    const moved: SpecialDate = { from: '2026-03-20', to: '2026-03-20', kind: 'open', hours: day('10:00', '14:00') }
    const changes = hoursChanges(
      { weekSchedule, specialDates: [past, holiday, moved] },
      { weekSchedule, specialDates: [{ ...moved, hours: day('10:00', '16:00') }, { ...holiday, from: '2026-03-04', to: '2026-03-04' }] },
      TODAY
    )
    expect(changes.map((change) => change.kind)).toEqual(['specialAdded', 'specialRemoved', 'specialChanged'])
  })

  it('names a change of rule, and leaves out the week a non-weekly rule does not use', () => {
    const rule = { mode: 'monthDays' as const, days: [1, 15], hours: day('09:00', '17:00') }
    const changes = hoursChanges({ weekSchedule }, { weekSchedule: makeWeekSchedule({}), rule }, TODAY)
    expect(changes).toEqual([{ kind: 'rule', before: { mode: 'weekdays' }, after: rule }])
  })

  it('finds nothing when nothing changed', () => {
    expect(hoursChanges({ weekSchedule, specialDates: [holiday] }, { weekSchedule, specialDates: [holiday] }, TODAY)).toEqual([])
  })
})

describe('serviceLosses', () => {
  const availability = { mode: 'weekdays' as const, days: ['monday' as const, 'wednesday' as const] }

  it('folds the same lost hours every week into one weekly line', () => {
    const after = { weekSchedule: makeWeekSchedule({ monday: day('09:00', '17:00'), wednesday: day('09:00', '12:00') }) }
    expect(serviceLosses({ before: { weekSchedule }, after, availability, todayKey: TODAY, horizonDays: 28 })).toEqual([
      { kind: 'weekly', day: 'wednesday', from: '2026-03-04', parts: [{ start: '12:00', end: '17:00' }] },
    ])
  })

  it('lists a one-off closure by its date, as the whole day', () => {
    const after = { weekSchedule, specialDates: [holiday] }
    expect(serviceLosses({ before: { weekSchedule }, after, availability, todayKey: TODAY, horizonDays: 28 })).toEqual([
      { kind: 'date', dayKey: '2026-03-09', parts: null },
    ])
  })

  it('finds nothing for days the service is never offered on', () => {
    const after = { weekSchedule: makeWeekSchedule({ monday: day('09:00', '17:00') }) }
    const mondays = { mode: 'weekdays' as const, days: ['monday' as const] }
    expect(serviceLosses({ before: { weekSchedule }, after, availability: mondays, todayKey: TODAY, horizonDays: 28 })).toEqual([])
  })
})

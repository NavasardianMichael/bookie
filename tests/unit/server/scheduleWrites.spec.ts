import { describe, expect, it } from 'vitest'
import { day } from '@test/setup/fixtures'
import { syncDraft } from '../../../server/src/services/providerWrites'
import { applySpecialDateChange, applyWeekChange, parseScheduleChange } from '../../../server/src/services/scheduleWrites'

const TODAY = '2026-03-01'

describe('applySpecialDateChange', () => {
  const vacation = { from: '2026-03-10', to: '2026-03-20', kind: 'closed' as const, hours: null, note: 'Vacation' }

  // Changing one day of a vacation keeps the rest of it.
  it('trims a stored run around a new entry instead of dropping it', () => {
    expect(
      applySpecialDateChange([vacation], { set: [{ from: '2026-03-15', to: '2026-03-15', kind: 'open', hours: day('10:00', '12:00') }], remove: [] }, TODAY)
    ).toEqual({
      value: [
        { ...vacation, to: '2026-03-14' },
        { from: '2026-03-15', to: '2026-03-15', kind: 'open', hours: day('10:00', '12:00') },
        { ...vacation, from: '2026-03-16' },
      ],
    })
  })

  it('removes every entry covering a given date', () => {
    expect(applySpecialDateChange([vacation], { set: [], remove: ['2026-03-12'] }, TODAY)).toEqual({ value: [] })
  })
})

describe('applyWeekChange', () => {
  it('replaces only the weekdays given', () => {
    expect(applyWeekChange({ monday: day('09:00', '17:00'), tuesday: day('09:00', '17:00') }, { tuesday: day('12:00', '20:00') })).toEqual({
      monday: day('09:00', '17:00'),
      tuesday: day('12:00', '20:00'),
    })
  })
})

describe('parseScheduleChange', () => {
  it('refuses an unknown weekday and a malformed day', () => {
    expect(parseScheduleChange({ weekSchedule: { funday: day('09:00', '17:00') } }, TODAY)).toHaveProperty('error')
    expect(parseScheduleChange({ weekSchedule: { monday: day('17:00', '09:00') } }, TODAY)).toHaveProperty('error')
  })

  it('stores a closed day as an empty window', () => {
    expect(parseScheduleChange({ weekSchedule: { monday: null } }, TODAY)).toEqual({
      value: { weekSchedule: { monday: { availability: { start: '', end: '' }, breaks: [] } } },
    })
  })
})

describe('syncDraft', () => {
  // A live write must not be undone by the next Publish of an older draft.
  it('updates only the keys the draft already holds', () => {
    expect(syncDraft({ fullName: 'Old', description: 'Draft' }, { fullName: 'New', weekSchedule: {} })).toEqual({
      fullName: 'New',
      description: 'Draft',
    })
  })

  it('is undefined when nothing in the draft changes, or there is no draft', () => {
    expect(syncDraft({ description: 'Draft' }, { fullName: 'New' })).toBeUndefined()
    expect(syncDraft(null, { fullName: 'New' })).toBeUndefined()
  })
})

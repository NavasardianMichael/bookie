import { describe, expect, it } from 'vitest'
import { SpecialDate, WeekSchedule } from '@store/providers/profile/types'
import { ROUTES } from '@constants/routes'
import {
  assistantActionRoute,
  emailsClients,
  hoursAfterSchedulePatch,
  proposalStatusFrom,
  toSchedulePatch,
} from '@helpers/assistant'
import { applySpecialDateChange } from '@helpers/specialDates'

describe('toSchedulePatch', () => {
  it('folds every schedule change into one write and leaves the rest out', () => {
    expect(
      toSchedulePatch([
        { type: 'setWeeklyHours', days: [{ day: 'monday', ranges: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] }] },
        { type: 'setSpecialDates', entries: [{ from: '2026-03-03', to: '2026-03-03', ranges: [], note: 'Off' }] },
        { type: 'removeSpecialDates', dates: ['2026-04-01'] },
        { type: 'setOnlineBooking', enabled: false },
        { type: 'setClock', timeFormat: 'h12' },
        { type: 'cancelBooking', bookingId: 'b1' },
      ])
    ).toEqual({
      weekSchedule: {
        monday: { availability: { start: '09:00', end: '17:00' }, breaks: [{ start: '12:00', end: '13:00' }] },
      },
      specialDates: { set: [{ from: '2026-03-03', to: '2026-03-03', kind: 'closed', hours: null, note: 'Off' }], remove: ['2026-04-01'] },
      available: false,
      timeFormat: 'h12',
    })
  })

  it('is null without a schedule change', () => {
    expect(toSchedulePatch([{ type: 'setListed', enabled: true }])).toBeNull()
  })
})

describe('proposalStatusFrom', () => {
  it('is applied, partial, or nothing — a proposal nothing came of stays pending', () => {
    expect(proposalStatusFrom([{ type: 'setListed', ok: true }])).toBe('applied')
    expect(proposalStatusFrom([{ type: 'setListed', ok: true }, { type: 'cancelBooking', ok: false }])).toBe('partial')
    expect(proposalStatusFrom([{ type: 'cancelBooking', ok: false }])).toBeNull()
  })
})

describe('assistantActionRoute', () => {
  it('points each change at the page where it is made by hand', () => {
    expect(assistantActionRoute('setSpecialDates')).toBe(ROUTES.providerProfileAvailability)
    expect(assistantActionRoute('updateService')).toBe(ROUTES.providerServices)
    expect(assistantActionRoute('rescheduleBooking')).toBe(ROUTES.bookings)
    expect(assistantActionRoute('decideBooking')).toBe(ROUTES.providerProfileApprovals)
  })
})

describe('emailsClients', () => {
  it('is true only for changes a client hears about', () => {
    expect(emailsClients([{ type: 'setListed', enabled: true }])).toBe(false)
    expect(emailsClients([{ type: 'cancelBooking', bookingId: 'b1' }])).toBe(true)
  })
})

const closed = { availability: { start: '', end: '' }, breaks: [] }
const nineToFive = { availability: { start: '09:00', end: '17:00' }, breaks: [] }

describe('applySpecialDateChange (twin of the server merge)', () => {
  const run: SpecialDate = { from: '2026-03-01', to: '2026-03-10', kind: 'closed', hours: null, note: 'Away' }

  it('trims a stored run around a new entry instead of refusing the overlap', () => {
    const set: SpecialDate = { from: '2026-03-05', to: '2026-03-05', kind: 'open', hours: nineToFive }
    expect(applySpecialDateChange([run], { set: [set] })).toEqual([
      { ...run, to: '2026-03-04' },
      set,
      { ...run, from: '2026-03-06' },
    ])
  })

  it('drops every entry covering a removed date', () => {
    expect(applySpecialDateChange([run], { remove: ['2026-03-07'] })).toEqual([])
    expect(applySpecialDateChange([run], { remove: ['2026-04-07'] })).toEqual([run])
  })
})

describe('hoursAfterSchedulePatch', () => {
  const before = {
    weekSchedule: { monday: nineToFive, tuesday: nineToFive } as unknown as WeekSchedule,
    specialDates: [] as SpecialDate[],
  }

  it('is null when the patch leaves the hours alone', () => {
    expect(hoursAfterSchedulePatch(before, { available: false })).toBeNull()
    expect(hoursAfterSchedulePatch(before, { timeFormat: 'h12' })).toBeNull()
  })

  it('replaces only the named weekdays and merges special dates', () => {
    const after = hoursAfterSchedulePatch(before, {
      weekSchedule: { tuesday: closed },
      specialDates: { set: [{ from: '2026-03-02', to: '2026-03-02', kind: 'closed', hours: null }] },
    })
    expect(after?.weekSchedule.monday).toEqual(nineToFive)
    expect(after?.weekSchedule.tuesday).toEqual(closed)
    expect(after?.specialDates).toEqual([{ from: '2026-03-02', to: '2026-03-02', kind: 'closed', hours: null }])
  })
})

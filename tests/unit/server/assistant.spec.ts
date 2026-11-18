import { describe, expect, it } from 'vitest'
import { day, makeWeekSchedule } from '@test/setup/fixtures'
import { ASSISTANT_ERROR_CODES, ASSISTANT_MESSAGE_MAX, VISITOR_MESSAGE_MAX, VISITOR_TURNS_MAX } from '@constants/assistant'
import { ASSISTANT_ERROR } from '../../../server/src/lib/assistant-errors'
import {
  ASSISTANT_MESSAGE_MAX as SERVER_MESSAGE_MAX,
  ASSISTANT_TITLE_MAX,
  type AssistantContext,
  conversationTitle,
  historyToTurns,
  narrowAction,
  parseProposal,
} from '../../../server/src/services/assistant'
import {
  VISITOR_MESSAGE_MAX as SERVER_VISITOR_MAX,
  VISITOR_TURNS_MAX as SERVER_TURNS_MAX,
} from '../../../server/src/services/visitorAssistant'

const context: AssistantContext = {
  today: '2026-03-02',
  weekday: 'monday',
  nowTime: '12:00',
  timeZone: 'Europe/Berlin',
  timeFormat: 'h24',
  provider: {
    fullName: 'Anna Hair',
    description: null,
    address: '',
    available: true,
    listed: true,
    requiresBookingApproval: false,
    scheduleRule: { mode: 'weekdays' },
    weekSchedule: makeWeekSchedule({ monday: day('09:00', '18:00') }),
    specialDates: [{ from: '2026-03-10', to: '2026-03-12', kind: 'closed', hours: null }],
    notifications: { newBooking: true, bookingChanges: true, appointmentReminders: true, appointmentReminderMinutes: 1440 },
    seo: { title: null, description: null, slug: null },
    categories: [],
    visitorAssistantEnabled: false,
  },
  plan: { maxActiveServices: 30, customSlug: true, visitorAssistant: false },
  services: [
    {
      id: 's1',
      name: 'Cut',
      durationMinutes: 30,
      price: 20,
      currency: 'EUR',
      description: null,
      active: true,
      availability: { mode: 'always' },
      hasBookings: true,
    },
    {
      id: 's2',
      name: 'Colour',
      durationMinutes: 90,
      price: null,
      currency: null,
      description: null,
      active: true,
      availability: { mode: 'always' },
      hasBookings: false,
    },
  ],
  bookings: [
    { id: 'b1', status: 'pending', start: '2026-03-03 10:00', durationMinutes: 30, service: 'Cut', client: 'Mia' },
    { id: 'b2', status: 'scheduled', start: '2026-03-04 11:00', durationMinutes: 30, service: 'Cut', client: 'Leo' },
  ],
}

// The web and the API share no module, so the codes and caps are pinned here.
describe('assistant codes and caps', () => {
  it('matches the web constants', () => {
    expect(ASSISTANT_ERROR_CODES).toEqual(ASSISTANT_ERROR)
    expect(ASSISTANT_MESSAGE_MAX).toBe(SERVER_MESSAGE_MAX)
    expect(VISITOR_MESSAGE_MAX).toBe(SERVER_VISITOR_MAX)
    expect(VISITOR_TURNS_MAX).toBe(SERVER_TURNS_MAX)
  })
})

describe('narrowAction', () => {
  it('keeps the weekdays it can read, in week order', () => {
    expect(
      narrowAction(
        {
          type: 'setWeeklyHours',
          days: [
            { day: 'friday', ranges: [] },
            { day: 'monday', ranges: [{ start: '10:00', end: '14:00' }] },
          ],
        },
        context
      )
    ).toEqual({
      type: 'setWeeklyHours',
      days: [
        { day: 'monday', ranges: [{ start: '10:00', end: '14:00' }] },
        { day: 'friday', ranges: [] },
      ],
    })
  })

  it('refuses a special date in the past, and defaults `to` to `from`', () => {
    expect(narrowAction({ type: 'setSpecialDates', entries: [{ from: '2026-03-01', ranges: [] }] }, context)).toBeNull()
    expect(narrowAction({ type: 'setSpecialDates', entries: [{ from: '2026-03-03', ranges: [] }] }, context)).toEqual({
      type: 'setSpecialDates',
      entries: [{ from: '2026-03-03', to: '2026-03-03', kind: 'closed', ranges: [] }],
    })
  })

  it('removes only special dates that exist', () => {
    expect(narrowAction({ type: 'removeSpecialDates', dates: ['2026-03-11', '2026-04-01'] }, context)).toEqual({
      type: 'removeSpecialDates',
      dates: ['2026-03-11'],
    })
  })

  // A booked service cannot be deleted (`409`); turning it off is the same request, made possible.
  it('turns a booked service off instead of deleting it', () => {
    expect(narrowAction({ type: 'deleteService', serviceId: 's1' }, context)).toEqual({
      type: 'updateService',
      serviceId: 's1',
      serviceName: 'Cut',
      active: false,
    })
    expect(narrowAction({ type: 'deleteService', serviceId: 's2' }, context)).toEqual({
      type: 'deleteService',
      serviceId: 's2',
      serviceName: 'Colour',
    })
  })

  it('refuses an unknown service or booking, and a decision on a booking that is not pending', () => {
    expect(narrowAction({ type: 'updateService', serviceId: 'nope', name: 'X' }, context)).toBeNull()
    expect(narrowAction({ type: 'cancelBooking', bookingId: 'nope' }, context)).toBeNull()
    expect(narrowAction({ type: 'decideBooking', bookingId: 'b2', decision: 'approve' }, context)).toBeNull()
  })

  it('names the booking it acts on, for the card', () => {
    expect(narrowAction({ type: 'decideBooking', bookingId: 'b1', decision: 'approve' }, context)).toEqual({
      type: 'decideBooking',
      bookingId: 'b1',
      decision: 'approve',
      booking: { start: '2026-03-03 10:00', client: 'Mia', service: 'Cut' },
    })
  })

  it('refuses a reschedule to a time already gone today', () => {
    expect(narrowAction({ type: 'rescheduleBooking', bookingId: 'b2', date: '2026-03-02', time: '11:00' }, context)).toBeNull()
    expect(narrowAction({ type: 'rescheduleBooking', bookingId: 'b2', date: '2026-03-02', time: '15:00' }, context)).not.toBeNull()
  })

  it('refuses what the plan does not allow', () => {
    expect(narrowAction({ type: 'setVisitorAssistant', enabled: true }, context)).toBeNull()
    expect(narrowAction({ type: 'setVisitorAssistant', enabled: false }, context)).toEqual({
      type: 'setVisitorAssistant',
      enabled: false,
    })
    expect(
      narrowAction({ type: 'updateSeo', slug: 'anna' }, { ...context, plan: { ...context.plan, customSlug: false } })
    ).toBeNull()
  })

  it('refuses an unknown action type', () => {
    expect(narrowAction({ type: 'setPassword', value: 'x' }, context)).toBeNull()
  })
})

describe('parseProposal', () => {
  it('keeps what can be applied and counts what was dropped', () => {
    expect(
      parseProposal(
        {
          summary: 'Closed tomorrow.',
          actions: [{ type: 'setSpecialDates', entries: [{ from: '2026-03-03', ranges: [] }] }, { type: 'nope' }],
        },
        context
      )
    ).toEqual({
      proposal: {
        kind: 'changes',
        summary: 'Closed tomorrow.',
        actions: [{ type: 'setSpecialDates', entries: [{ from: '2026-03-03', to: '2026-03-03', kind: 'closed', ranges: [] }] }],
      },
      dropped: 1,
    })
  })

  it('is null when nothing can be applied', () => {
    expect(parseProposal({ summary: 'x', actions: [{ type: 'nope' }] }, context)).toBeNull()
  })
})

describe('historyToTurns', () => {
  it('replays proposals as words, merges one side, and starts with the provider', () => {
    expect(
      historyToTurns([
        { role: 'model', text: 'Hello', proposal: null, proposalStatus: null, outcome: null },
        { role: 'user', text: 'Close Friday', proposal: null, proposalStatus: null, outcome: null },
        {
          role: 'model',
          text: 'Ready.',
          proposal: { kind: 'changes', summary: 'Closed Friday', actions: [] },
          proposalStatus: 'applied',
          outcome: null,
        },
        { role: 'model', text: 'Anything else?', proposal: null, proposalStatus: null, outcome: null },
      ])
    ).toEqual([
      { role: 'user', text: 'Close Friday' },
      { role: 'model', text: 'Ready.\n[Proposal: "Closed Friday" Actions: []. Status: applied.]\n\nAnything else?' },
    ])
  })
})

describe('conversationTitle', () => {
  it('is the first message, whitespace collapsed', () => {
    expect(conversationTitle('  Closed   tomorrow,\n open late on Friday ')).toBe('Closed tomorrow, open late on Friday')
  })

  it('cuts a long message at a word, with an ellipsis, within the limit', () => {
    const text = 'I am closed tomorrow and the day after I will work until ten in the evening for the regulars'
    const title = conversationTitle(text)
    expect(title.length).toBeLessThanOrEqual(ASSISTANT_TITLE_MAX)
    expect(title.endsWith('…')).toBe(true)
    expect(text.startsWith(title.slice(0, -1))).toBe(true)
    expect(title.at(-2)).not.toBe(' ')
  })

  it('cuts one unbroken word mid-word rather than leaving almost nothing', () => {
    const title = conversationTitle('x'.repeat(200))
    expect(title).toBe(`${'x'.repeat(ASSISTANT_TITLE_MAX - 1)}…`)
  })

  // A diary photo sent without a note: the client names it, in the reader's language.
  it('is empty for an empty message', () => {
    expect(conversationTitle('   ')).toBe('')
  })
})

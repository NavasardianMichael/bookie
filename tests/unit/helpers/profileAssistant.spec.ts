import { describe, expect, it } from 'vitest'
import { CLOSED_DAY, day, makeWeekSchedule } from '@test/setup/fixtures'
import { AssistantProposal, AssistantService } from '@api/profileAssistant/types'
import { ProviderProfile } from '@store/providers/profile/types'
import {
  changedSteps,
  exceedsServiceCap,
  proposalFromProfile,
  proposalToReviewValues,
  removedServices,
  reviewValuesToProposal,
  serviceStatus,
} from '@helpers/profileAssistant'
import { dayFormsToWeekSchedule, weekScheduleToDayForms } from '@helpers/schedule'

const CUT: AssistantService = {
  id: 'svc-cut',
  name: 'Haircut',
  description: null,
  duration: 60,
  price: 8000,
  currency: 'AMD',
  availability: { mode: 'always' },
}

const COLOUR: AssistantService = { ...CUT, id: 'svc-colour', name: 'Colouring', duration: 120, price: 20000 }

const WEEK = makeWeekSchedule({ saturday: CLOSED_DAY, sunday: CLOSED_DAY })

const proposal = (overrides: Partial<AssistantProposal> = {}): AssistantProposal => ({
  fullName: 'Anna Petrosyan',
  description: 'Hair studio.',
  categories: [{ id: 'cat-hair', name: 'Hairdressing' }],
  services: [CUT, COLOUR],
  weekSchedule: WEEK,
  timeZone: 'Asia/Yerevan',
  timeFormat: 'h24',
  requiresBookingApproval: false,
  paymentMethods: ['cash'],
  paymentNotes: null,
  notifications: { appointmentReminders: true, appointmentReminderMinutes: 1440, bookingChanges: true, newBooking: true },
  seoTitle: null,
  seoDescription: null,
  slug: null,
  ...overrides,
})

describe('weekScheduleToDayForms and dayFormsToWeekSchedule', () => {
  it('round-trip a week, breaks included', () => {
    const week = makeWeekSchedule({
      monday: day('09:00', '18:00', [{ start: '13:00', end: '14:00' }]),
      sunday: CLOSED_DAY,
    })
    const forms = weekScheduleToDayForms(week)
    expect(forms.monday.ranges).toHaveLength(2)
    expect(forms.sunday.open).toBe(false)
    expect(dayFormsToWeekSchedule(forms)).toEqual(week)
  })

  it('give a closed day one default window, so ticking it open shows hours', () => {
    expect(weekScheduleToDayForms(makeWeekSchedule({ sunday: CLOSED_DAY })).sunday.ranges).toHaveLength(1)
  })
})

describe('proposalToReviewValues and reviewValuesToProposal', () => {
  it('round-trip a proposal', () => {
    const values = proposalToReviewValues(proposal())
    expect(reviewValuesToProposal(values, [CUT, COLOUR])).toEqual(proposal())
  })

  it('send a new category by name, and an emptied text field as null', () => {
    const values = {
      ...proposalToReviewValues(proposal()),
      categories: [{ name: ' Barbering ', isNew: true }],
      description: '  ',
      slug: 'Anna-Hair',
    }
    expect(reviewValuesToProposal(values, [])).toMatchObject({
      categories: [{ id: null, name: 'Barbering' }],
      description: null,
      slug: 'anna-hair',
    })
  })
})

describe('serviceStatus and removedServices', () => {
  it('tell a new, a changed and a kept service apart', () => {
    expect(serviceStatus({ ...CUT, id: null }, [CUT])).toBe('new')
    expect(serviceStatus({ ...CUT, price: 9000 }, [CUT])).toBe('changed')
    expect(serviceStatus({ ...CUT }, [CUT])).toBe('kept')
  })

  it('list the current services the review no longer has', () => {
    expect(removedServices([CUT, COLOUR], [CUT])).toEqual([COLOUR])
  })
})

describe('changedSteps', () => {
  it('marks only the sections that differ', () => {
    const next = proposal({
      services: [CUT],
      weekSchedule: makeWeekSchedule({ monday: day('18:00', '21:00') }),
      requiresBookingApproval: true,
    })
    expect([...changedSteps(proposal(), next)].sort()).toEqual(['approvals', 'availability', 'services'])
  })

  it('reads the same hours written differently as unchanged', () => {
    const split = makeWeekSchedule({ saturday: CLOSED_DAY, sunday: CLOSED_DAY })
    expect(changedSteps(proposal(), proposal({ weekSchedule: split })).size).toBe(0)
  })
})

describe('exceedsServiceCap', () => {
  it('refuses growth past the cap, never holding steady or shrinking above it', () => {
    expect(exceedsServiceCap(2, 4, 3)).toBe(true)
    expect(exceedsServiceCap(5, 5, 3)).toBe(false)
    expect(exceedsServiceCap(5, 4, 3)).toBe(false)
    expect(exceedsServiceCap(2, 40, null)).toBe(false)
  })
})

describe('proposalFromProfile', () => {
  it('reads what the tabs show: a draft over the live value, active services only', () => {
    const profile = {
      id: 'provider-1',
      basic: { fullName: 'Anna', description: 'Live text', available: true, categories: [] },
      details: {
        location: { address: '', url: '' },
        gallery: [],
        weekSchedule: WEEK,
        paymentInfo: { methods: ['card_on_site'], notes: 'Card only' },
      },
      services: {
        allIds: ['svc-cut', 'svc-old'],
        byId: {
          'svc-cut': { id: 'svc-cut', name: 'Haircut', duration: 60, price: 8000, currency: 'AMD', active: true, availability: { mode: 'always' } },
          'svc-old': { id: 'svc-old', name: 'Old', duration: 30, active: false, availability: { mode: 'always' } },
        },
      },
      personal: { plan: 'free' },
      draft: { fullName: 'Anna Petrosyan', description: null },
    } as unknown as ProviderProfile

    expect(proposalFromProfile(profile)).toMatchObject({
      fullName: 'Anna Petrosyan',
      description: null,
      paymentMethods: ['card_on_site'],
      paymentNotes: 'Card only',
      services: [{ id: 'svc-cut', price: 8000, description: null }],
    })
  })
})

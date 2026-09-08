import { describe, expect, it } from 'vitest'
import {
  processCreateAppointmentResponse,
  processListAppointmentsResponse,
} from '@api/appointments/processors'
import { AppointmentResponse } from '@api/appointments/types'

const appointment = (overrides: Partial<AppointmentResponse> = {}): AppointmentResponse => ({
  id: 'a-1',
  providerId: 'p-1',
  serviceId: 's-1',
  consumerId: 'c-1',
  time: { startDate: '2026-03-04T09:00:00.000Z', endDate: '2026-03-04T09:30:00.000Z', duration: 30 },
  status: 'scheduled',
  ...overrides,
})

describe('processCreateAppointmentResponse', () => {
  it('unwraps the envelope', () => {
    const value = appointment({ notes: 'Please call on arrival', paymentMethods: ['cash'] })
    expect(processCreateAppointmentResponse({ value, error: null })).toEqual(value)
  })

  // A guest booking carries no consumerId, so anything reading `.consumerId`
  // unconditionally breaks on exactly the bookings this feature added.
  it('keeps a guest booking, which has no consumerId', () => {
    const value = appointment({
      consumerId: undefined,
      guest: {
        firstName: 'Alex',
        lastName: 'Morgan',
        phone: { code: 374, number: 77000201 },
        email: 'alex@example.com',
      },
    })

    const processed = processCreateAppointmentResponse({ value, error: null })

    expect(processed.consumerId).toBeUndefined()
    expect(processed.guest?.firstName).toBe('Alex')
  })
})

describe('processListAppointmentsResponse', () => {
  it('unwraps a list', () => {
    const value = [appointment(), appointment({ id: 'a-2' })]
    expect(processListAppointmentsResponse({ value, error: null })).toHaveLength(2)
  })

  // The API answers `[]` for a provider with no bookings, but a null slips through
  // whenever the envelope is built from a Prisma result that found nothing — an empty
  // list has to render, not crash the appointments page.
  it('falls back to an empty list when the envelope carries no value', () => {
    expect(processListAppointmentsResponse({ value: null as never, error: null })).toEqual([])
  })
})

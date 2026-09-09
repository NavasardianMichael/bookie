import { describe, expect, it } from 'vitest'
import {
  processListAppointmentsResponse,
  processProviderBookingsCalendarResponse,
  processProviderBookingsResponse,
} from '@api/appointments/processors'
import { ProviderBooking, ProviderBookingsResponse } from '@api/appointments/types'
import { APIResponse } from '@interfaces/api'

/** The server envelope every processor takes. */
const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const booking = (id: string): ProviderBooking => ({
  id,
  time: { startDate: '2026-09-14T09:00:00.000Z', endDate: '2026-09-14T09:30:00.000Z', duration: 30 },
  status: 'scheduled',
  createdAt: '2026-09-10T09:00:00.000Z',
  service: { id: 'service-1', name: 'Cut' },
  booker: { kind: 'consumer', id: 'consumer-1', firstName: 'Ada', lastName: 'Lovelace', phone: { code: 374, number: 10000000 } },
})

const paged = (items: ProviderBooking[]): ProviderBookingsResponse => ({
  items,
  total: items.length,
  page: 1,
  perPage: 20,
  pageCount: 1,
})

describe('processListAppointmentsResponse', () => {
  it('reads a missing list as empty rather than crashing the panel', () => {
    expect(processListAppointmentsResponse(envelope(undefined as never))).toEqual([])
  })
})

describe('processProviderBookingsResponse', () => {
  it('keeps the page window alongside the items', () => {
    // The pager needs `pageCount` and the heading needs `total` even on page 3, so
    // flattening the envelope down to an array would lose both.
    const result = processProviderBookingsResponse(envelope(paged([booking('a'), booking('b')])))

    expect(result.items).toHaveLength(2)
    expect(result).toMatchObject({ total: 2, page: 1, perPage: 20, pageCount: 1 })
  })

  it('survives a page with no items', () => {
    const result = processProviderBookingsResponse(
      envelope({ items: undefined as never, total: 0, page: 1, perPage: 20, pageCount: 1 })
    )
    expect(result.items).toEqual([])
  })
})

describe('processProviderBookingsCalendarResponse', () => {
  it('keeps only the day map, since the caller already knows what it asked for', () => {
    const days = { '2026-09-14': { total: 3, live: 2 } }
    expect(processProviderBookingsCalendarResponse(envelope({ month: '2026-09', timeZone: 'UTC', days }))).toEqual(days)
  })

  it('degrades to unbadged days rather than throwing over the list underneath', () => {
    expect(processProviderBookingsCalendarResponse(envelope(undefined as never))).toEqual({})
  })
})

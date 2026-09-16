import { describe, expect, it } from 'vitest'
import {
  type ConsumerAppointmentListItem,
  filterAndSortConsumerAppointments,
} from '@helpers/consumerAppointments'

const now = new Date('2026-09-11T12:00:00.000Z')

const item = (
  id: string,
  overrides: Partial<ConsumerAppointmentListItem> = {}
): ConsumerAppointmentListItem => ({
  id,
  status: 'scheduled',
  time: { startDate: '2026-09-12T10:00:00.000Z' },
  createdAt: '2026-09-01T10:00:00.000Z',
  provider: { basic: { firstName: 'Ada', lastName: 'Lovelace' } },
  service: { name: 'Cut' },
  ...overrides,
})

describe('filterAndSortConsumerAppointments', () => {
  it('keeps upcoming live bookings when no search or status filter is set', () => {
    const items = [
      item('future'),
      item('past', { time: { startDate: '2026-09-01T10:00:00.000Z' } }),
      item('cancelled', { status: 'cancelled', time: { startDate: '2026-09-12T10:00:00.000Z' } }),
    ]

    const result = filterAndSortConsumerAppointments(items, {
      q: '',
      statuses: [],
      sort: 'startAsc',
      now,
    })

    expect(result.map((row) => row.id)).toEqual(['future'])
  })

  it('searches provider and service across the full history', () => {
    const items = [
      item('cut', { service: { name: 'Haircut' }, time: { startDate: '2026-09-01T10:00:00.000Z' } }),
      item('color', { service: { name: 'Colour' }, provider: { basic: { firstName: 'Grace', lastName: 'Hopper' } } }),
    ]

    const byService = filterAndSortConsumerAppointments(items, {
      q: 'hair',
      statuses: [],
      sort: 'startAsc',
      now,
    })
    const byProvider = filterAndSortConsumerAppointments(items, {
      q: 'hopper',
      statuses: [],
      sort: 'startAsc',
      now,
    })

    expect(byService.map((row) => row.id)).toEqual(['cut'])
    expect(byProvider.map((row) => row.id)).toEqual(['color'])
  })

  it('filters by status even for past bookings', () => {
    const items = [
      item('done', { status: 'completed', time: { startDate: '2026-09-01T10:00:00.000Z' } }),
      item('live'),
    ]

    const result = filterAndSortConsumerAppointments(items, {
      q: '',
      statuses: ['completed'],
      sort: 'startAsc',
      now,
    })

    expect(result.map((row) => row.id)).toEqual(['done'])
  })

  it('sorts by start descending and by provider name', () => {
    const items = [
      item('a', {
        time: { startDate: '2026-09-13T10:00:00.000Z' },
        provider: { basic: { firstName: 'Zoe', lastName: 'Zed' } },
      }),
      item('b', {
        time: { startDate: '2026-09-12T10:00:00.000Z' },
        provider: { basic: { firstName: 'Amy', lastName: 'Ada' } },
      }),
    ]

    expect(
      filterAndSortConsumerAppointments(items, { q: '', statuses: [], sort: 'startDesc', now }).map((row) => row.id)
    ).toEqual(['a', 'b'])
    expect(
      filterAndSortConsumerAppointments(items, { q: '', statuses: [], sort: 'nameAsc', now }).map((row) => row.id)
    ).toEqual(['b', 'a'])
  })
})

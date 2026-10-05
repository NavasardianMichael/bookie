import { describe, expect, it } from 'vitest'
import { PaymentMethod } from '@interfaces/settings'
import {
  BookingSummaryData,
  BookingSummaryLabels,
  buildBookingSummaryFields,
  formatBookingSummaryPlainText,
} from '@helpers/bookingSummary'

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card_on_site: 'Card on site',
  bank_transfer: 'Bank transfer',
}

const LABELS: BookingSummaryLabels = {
  provider: 'Provider',
  service: 'Service',
  date: 'Date',
  time: 'Time',
  timeZone: 'Time zone',
  timeZoneName: (timeZone) => `zone:${timeZone}`,
  duration: 'Duration',
  durationValue: (minutes) => `${minutes} min`,
  price: 'Price',
  location: 'Location',
  phone: 'Phone',
  preferredPayment: 'Preferred payment',
  paymentMethod: (method) => METHOD_LABELS[method],
}

const BASE: BookingSummaryData = {
  providerName: 'Anna Petrosyan',
  serviceName: 'Haircut',
  serviceDescription: 'Wash and cut',
  startISO: '2026-03-04T14:30:00.000Z',
  durationMinutes: 30,
  price: '70 USD',
  address: '12 Abovyan St',
  phone: '+374 77 123456',
  paymentMethods: ['cash', 'bank_transfer'],
}

describe('buildBookingSummaryFields', () => {
  it('emits every filled row, including preferred payment', () => {
    expect(buildBookingSummaryFields(BASE, LABELS)).toEqual([
      { key: 'provider', label: 'Provider', text: 'Anna Petrosyan' },
      { key: 'service', label: 'Service', text: 'Haircut — Wash and cut' },
      { key: 'date', label: 'Date', text: 'Wednesday, 4 March 2026' },
      { key: 'time', label: 'Time', text: '02:30 PM – 03:00 PM' },
      { key: 'duration', label: 'Duration', text: '30 min' },
      { key: 'price', label: 'Price', text: '70 USD' },
      { key: 'location', label: 'Location', text: '12 Abovyan St' },
      { key: 'phone', label: 'Phone', text: '+374 77 123456' },
      { key: 'payment', label: 'Preferred payment', text: 'Cash, Bank transfer' },
    ])
  })

  it('omits optional rows when they are empty', () => {
    const keys = buildBookingSummaryFields(
      {
        providerName: 'Anna Petrosyan',
        startISO: '2026-03-04T14:30:00.000Z',
        durationMinutes: 30,
        paymentMethods: [],
      },
      LABELS
    ).map((field) => field.key)

    expect(keys).toEqual(['provider', 'date', 'time', 'duration'])
  })

  // TZ is pinned to UTC, so these times can only read 18:30 if the provider's zone was used.
  it("writes date and time on the provider's clock and names the zone", () => {
    const fields = buildBookingSummaryFields({ ...BASE, timeZone: 'Asia/Yerevan' }, LABELS)

    expect(fields.find((field) => field.key === 'time')?.text).toBe('06:30 PM – 07:00 PM')
    expect(fields.find((field) => field.key === 'timeZone')).toEqual({
      key: 'timeZone',
      label: 'Time zone',
      text: 'zone:Asia/Yerevan',
    })
  })

  it('moves the date too when the provider is already on the next day', () => {
    const fields = buildBookingSummaryFields(
      { ...BASE, startISO: '2026-03-04T21:30:00.000Z', timeZone: 'Asia/Yerevan' },
      LABELS
    )

    expect(fields.find((field) => field.key === 'date')?.text).toBe('Thursday, 5 March 2026')
    expect(fields.find((field) => field.key === 'time')?.text).toBe('01:30 AM – 02:00 AM')
  })

  it("prints the time on the provider's 24-hour clock when they chose it", () => {
    const fields = buildBookingSummaryFields({ ...BASE, timeZone: 'Asia/Yerevan', timeFormat: 'h24' }, LABELS)

    expect(fields.find((field) => field.key === 'time')?.text).toBe('18:30 – 19:00')
  })
})

describe('formatBookingSummaryPlainText', () => {
  it('joins label and text so copy matches the details list', () => {
    const fields = buildBookingSummaryFields(
      {
        providerName: 'Anna Petrosyan',
        startISO: '2026-03-04T14:30:00.000Z',
        durationMinutes: 30,
        paymentMethods: ['cash'],
      },
      LABELS
    )

    expect(formatBookingSummaryPlainText(fields)).toBe(
      [
        'Provider: Anna Petrosyan',
        'Date: Wednesday, 4 March 2026',
        'Time: 02:30 PM – 03:00 PM',
        'Duration: 30 min',
        'Preferred payment: Cash',
      ].join('\n')
    )
  })
})

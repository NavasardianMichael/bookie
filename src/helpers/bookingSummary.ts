import { TimeFormat } from '@interfaces/schedule'
import { PaymentMethod } from '@interfaces/settings'
import { getTimeDisplayFormat } from './timeFormat'
import { inTimeZone } from './timeZone'

export type BookingSummaryData = {
  providerName: string
  serviceName?: string
  serviceDescription?: string
  /** ISO start of the picked slot. */
  startISO: string
  /**
   * The provider's IANA zone. Date and time are written on *their* clock and the zone gets
   * a row of its own, because this text is copied and shared away from the page that labels
   * it. Absent: the runtime's zone, and no row.
   */
  timeZone?: string
  /**
   * The provider's clock. `useBookingSummaryFields` resolves an unchosen one to the reader's
   * locale before it gets here; absent, 12-hour.
   */
  timeFormat?: TimeFormat
  durationMinutes: number
  /** Pre-formatted, e.g. `70 USD`. Absent when the service carries no price. */
  price?: string
  address?: string
  /** Display form, e.g. `+374 77 123456`. Absent when the provider has no number. */
  phone?: string
  /** Methods the visitor chose at confirm. Empty omits the row. */
  paymentMethods: PaymentMethod[]
}

export type BookingSummaryLabels = {
  provider: string
  service: string
  date: string
  time: string
  timeZone: string
  /** `Armenia Standard Time (GMT+4)` — injected so the locale stays out of this module. */
  timeZoneName: (timeZone: string, at: Date) => string
  duration: string
  durationValue: (minutes: number) => string
  price: string
  location: string
  phone: string
  preferredPayment: string
  paymentMethod: (method: PaymentMethod) => string
}

export type BookingSummaryField = {
  key: string
  label: string
  text: string
}

/**
 * The rows `BookingSummary` renders and "Copy booking details" pastes. Labels are
 * injected so this stays free of next-intl (and so a test can pin English without a
 * catalogue).
 */
export const buildBookingSummaryFields = (
  data: BookingSummaryData,
  labels: BookingSummaryLabels
): BookingSummaryField[] => {
  const start = inTimeZone(data.startISO, data.timeZone)
  const end = start.add(data.durationMinutes, 'minute')
  const timeDisplayFormat = getTimeDisplayFormat(data.timeFormat ?? 'h12')

  const rows: (BookingSummaryField | null)[] = [
    { key: 'provider', label: labels.provider, text: data.providerName },
    data.serviceName
      ? {
          key: 'service',
          label: labels.service,
          text: data.serviceDescription ? `${data.serviceName} — ${data.serviceDescription}` : data.serviceName,
        }
      : null,
    { key: 'date', label: labels.date, text: start.format('dddd, D MMMM YYYY') },
    {
      key: 'time',
      label: labels.time,
      text: `${start.format(timeDisplayFormat)} – ${end.format(timeDisplayFormat)}`,
    },
    data.timeZone
      ? {
          key: 'timeZone',
          label: labels.timeZone,
          text: labels.timeZoneName(data.timeZone, new Date(data.startISO)),
        }
      : null,
    {
      key: 'duration',
      label: labels.duration,
      text: labels.durationValue(data.durationMinutes),
    },
    data.price ? { key: 'price', label: labels.price, text: data.price } : null,
    data.address ? { key: 'location', label: labels.location, text: data.address } : null,
    data.phone ? { key: 'phone', label: labels.phone, text: data.phone } : null,
    data.paymentMethods.length
      ? {
          key: 'payment',
          label: labels.preferredPayment,
          text: data.paymentMethods.map((method) => labels.paymentMethod(method)).join(', '),
        }
      : null,
  ]

  return rows.filter((row): row is BookingSummaryField => row !== null)
}

export const formatBookingSummaryPlainText = (fields: BookingSummaryField[]): string =>
  fields.map((field) => `${field.label}: ${field.text}`).join('\n')

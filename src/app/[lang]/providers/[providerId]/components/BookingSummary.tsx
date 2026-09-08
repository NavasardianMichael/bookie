'use client'

import { FC, useMemo } from 'react'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { PaymentMethod } from '@interfaces/settings'
import { SCHEDULE_DISPLAY_FORMAT } from '@constants/schedule'
import { AppDescriptionList, AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'

export type BookingSummaryData = {
  providerName: string
  serviceName?: string
  serviceDescription?: string
  /** ISO start of the picked slot. */
  startISO: string
  durationMinutes: number
  /** Pre-formatted, e.g. `70 USD`. Absent when the service carries no price. */
  price?: string
  address?: string
  acceptedPaymentMethods: PaymentMethod[]
}

/**
 * Everything the booking commits the visitor to, spelled out before they confirm.
 *
 * The panel behind this reduced the whole booking to one joined line
 * (`Mar 4 • 14:30 • Haircut (70 USD)`), which is enough to recognise a pick but not
 * enough to check one — it named no provider, no duration, no end time and no address.
 *
 * A real `<dl>` via `AppDescriptionList` rather than stacked paragraphs, so each label
 * is bound to its value in the markup.
 */
export const BookingSummary: FC<BookingSummaryData> = ({
  providerName,
  serviceName,
  serviceDescription,
  startISO,
  durationMinutes,
  price,
  address,
  acceptedPaymentMethods,
}) => {
  const t = useTranslations('Booking')
  const tMethods = useTranslations('Settings.payments.methods')

  const items = useMemo<AppDescriptionListItem[]>(() => {
    const start = dayjs(startISO)
    // Derived, never stored: the API recomputes `endAt` off the service's own
    // duration, so showing anything else here would be a second source of truth.
    const end = start.add(durationMinutes, 'minute')

    const rows: (AppDescriptionListItem | null)[] = [
      { key: 'provider', label: t('summary.provider'), value: providerName },
      serviceName
        ? {
            key: 'service',
            label: t('summary.service'),
            value: serviceDescription ? `${serviceName} — ${serviceDescription}` : serviceName,
          }
        : null,
      { key: 'date', label: t('summary.date'), value: start.format('dddd, D MMMM YYYY') },
      {
        key: 'time',
        label: t('summary.time'),
        value: `${start.format(SCHEDULE_DISPLAY_FORMAT)} – ${end.format(SCHEDULE_DISPLAY_FORMAT)}`,
      },
      { key: 'duration', label: t('summary.duration'), value: t('summary.durationValue', { minutes: durationMinutes }) },
      price ? { key: 'price', label: t('summary.price'), value: price } : null,
      address ? { key: 'location', label: t('summary.location'), value: address } : null,
      acceptedPaymentMethods.length
        ? {
            key: 'payment',
            label: t('summary.accepts'),
            value: acceptedPaymentMethods.map((method) => tMethods(method)).join(', '),
          }
        : null,
    ]

    return rows.filter((row): row is AppDescriptionListItem => row !== null)
  }, [
    acceptedPaymentMethods,
    address,
    durationMinutes,
    price,
    providerName,
    serviceDescription,
    serviceName,
    startISO,
    t,
    tMethods,
  ])

  return <AppDescriptionList items={items} columns={1} />
}

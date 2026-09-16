'use client'

import { FC, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  type BookingSummaryData,
  type BookingSummaryField,
  buildBookingSummaryFields,
} from '@helpers/bookingSummary'
import { generateGoogleMapsLink } from '@helpers/location'
import { AppDescriptionList, AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import { CopyableLinkValue } from '@components/ui/CopyableLinkValue'

export type { BookingSummaryData } from '@helpers/bookingSummary'

export const useBookingSummaryFields = (data: BookingSummaryData): BookingSummaryField[] => {
  const t = useTranslations('Booking')
  const tCommon = useTranslations('Common')
  const tMethods = useTranslations('Settings.payments.methods')

  return useMemo(
    () =>
      buildBookingSummaryFields(data, {
        provider: t('summary.provider'),
        service: t('summary.service'),
        date: t('summary.date'),
        time: t('summary.time'),
        duration: t('summary.duration'),
        durationValue: (minutes) => t('summary.durationValue', { minutes }),
        price: t('summary.price'),
        location: t('summary.location'),
        phone: tCommon('phone'),
        preferredPayment: t('summary.preferredPayment'),
        paymentMethod: (method) => tMethods(method),
      }),
    [data, t, tCommon, tMethods]
  )
}

/**
 * Everything the booking commits the visitor to, spelled out before they confirm.
 *
 * The panel behind this reduced the whole booking to one joined line
 * (`Mar 4 • 14:30 • Haircut (70 USD)`), which is enough to recognise a pick but not
 * enough to check one — it named no provider, no duration, no end time and no address.
 *
 * A real `<dl>` via `AppDescriptionList` rather than stacked paragraphs, so each label
 * is bound to its value in the markup. Rows come from `buildBookingSummaryFields` so
 * "Copy booking details" pastes the same fields this list shows.
 */
export const BookingSummary: FC<BookingSummaryData> = (data) => {
  const t = useTranslations('Booking')
  const fields = useBookingSummaryFields(data)

  const items = useMemo<AppDescriptionListItem[]>(
    () =>
      fields.map((field) => {
        if (field.key === 'location' && data.address) {
          return {
            key: field.key,
            label: field.label,
            value: (
              <CopyableLinkValue
                href={generateGoogleMapsLink(data.address)}
                text={data.address}
                copyLabel={t('summary.copyLocation')}
                openInNewTab
              />
            ),
          }
        }
        if (field.key === 'phone' && data.phone) {
          return {
            key: field.key,
            label: field.label,
            value: (
              <CopyableLinkValue
                href={`tel:${data.phone.replace(/\s/g, '')}`}
                text={data.phone}
                copyLabel={t('summary.copyPhone')}
              />
            ),
          }
        }
        return { key: field.key, label: field.label, value: field.text }
      }),
    [data.address, data.phone, fields, t]
  )

  return <AppDescriptionList items={items} columns={1} />
}

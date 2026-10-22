import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { BookingClosedReason } from '@interfaces/booking'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  reason: BookingClosedReason
  providerName: string
  /** Already formatted for display and for the `tel:` href. Absent when hidden or unset. */
  phone?: string
  email?: string
}

/**
 * What the booking column shows instead of its calendar when the provider is not taking
 * bookings online — paused by their own switch, or their monthly allowance reached.
 *
 * The two reasons differ in copy only, and neither names a plan: the visitor is not the
 * one who pays, and "upgrade" would be a word addressed to somebody else. Both end the
 * same way, at the provider's own contact details, because a visitor who wanted to book
 * still can — just not through this page.
 */
export const BookingClosedNotice: FC<Props> = ({ reason, providerName, phone, email }) => {
  const t = useTranslations('Booking.closed')

  return (
    <Surface>
      {/* A live region: the notice also replaces the calendar mid-visit, when a submit is
          refused because the provider closed booking while the sheet was open. */}
      <div role='status'>
        <AppTitle level='h3' size='h3'>
          {t(`${reason}Title`)}
        </AppTitle>
        <AppParagraph size='body-sm' className='mt-2'>
          {t(`${reason}Body`, { name: providerName })}
        </AppParagraph>
      </div>

      {(phone || email) && (
        <div className='mt-5 flex flex-wrap gap-2'>
          {phone && (
            <AppLink href={`tel:${phone}`} variant='button' tone='primary'>
              {t('call', { phone })}
            </AppLink>
          )}
          {email && (
            <AppLink href={`mailto:${email}`} variant='button'>
              {t('email')}
            </AppLink>
          )}
        </div>
      )}
    </Surface>
  )
}

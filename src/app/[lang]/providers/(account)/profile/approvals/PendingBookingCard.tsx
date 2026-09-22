'use client'

import { FC } from 'react'
import { Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { ProviderBooking } from '@api/appointments/types'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  booking: ProviderBooking
  /** The slot has already come and gone; approving it is refused by the API. */
  expired: boolean
  /** Which decision is in flight, so only that button spins and neither can race. */
  pending: 'approve' | 'reject' | null
  onApprove: () => void
  onReject: () => void
}

type DetailProps = { label: string; value: string }

const Detail: FC<DetailProps> = ({ label, value }) => (
  <div className='flex min-w-0 flex-col gap-0.5'>
    <AppText size='caption' tone='muted' className='block'>
      {label}
    </AppText>
    <AppText size='body-sm' className='block wrap-break-word'>
      {value}
    </AppText>
  </div>
)

/**
 * One request awaiting a decision, with everything the decision rests on.
 *
 * Deliberately fuller than a Bookings row, which is a record to scan: this is the one
 * screen where a provider is being asked to *judge* a booking, and "approve" means
 * little without the time, the service, who is asking, how to reach them, what they
 * intend to pay with, and whatever they typed in the notes. `mapProviderBooking` already
 * returns all of it — the Bookings list simply does not render it.
 *
 * The contact details are the widening `server/CLAUDE.md` permits on this one payload:
 * they reach the provider the booking belongs to and nobody else.
 */
export const PendingBookingCard: FC<Props> = ({ booking, expired, pending, onApprove, onReject }) => {
  const t = useTranslations('Settings.approvals')
  const tBookings = useTranslations('Settings.bookings')
  const tMethods = useTranslations('Settings.payments.methods')
  const format = useFormatter()

  const name = `${booking.booker.firstName} ${booking.booker.lastName}`.trim() || tBookings('unknownBooker')
  const phone = booking.booker.phone?.number
    ? generateFriendlyPhoneNumber(booking.booker.phone, { delimiter: ' ', prefix: '+' })
    : undefined
  const price =
    booking.price !== undefined ? [booking.price, booking.currency].filter(Boolean).join(' ') : undefined
  const methods = booking.paymentMethods?.length
    ? booking.paymentMethods.map((method) => tMethods(method)).join(', ')
    : undefined

  const busy = pending !== null

  return (
    <li className='border-brand-border flex flex-col gap-4 rounded-brand border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <AppText size='caption' className='text-brand block'>
            {format.dateTime(new Date(booking.time.startDate), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </AppText>
          <AppText size='body' className='block font-semibold'>
            {name}
            {booking.booker.kind === 'guest' && (
              <Tag className='ms-2' color='default'>
                {tBookings('guest')}
              </Tag>
            )}
          </AppText>
        </div>
        {/* An expired request is still actionable — it can be declined, which is how it
            leaves the queue and how the client finally hears back. Only Approve is
            refused, by the API as well as here. */}
        {expired && <Tag color='orange'>{t('expired')}</Tag>}
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Detail
          label={t('detailService')}
          value={`${booking.service.name || tBookings('unknownService')} · ${tBookings('minutes', {
            count: booking.time.duration,
          })}`}
        />
        {price && <Detail label={t('detailPrice')} value={price} />}
        {phone && <Detail label={t('detailPhone')} value={phone} />}
        {booking.booker.email && <Detail label={t('detailEmail')} value={booking.booker.email} />}
        {methods && <Detail label={t('detailPayment')} value={methods} />}
        <Detail
          label={t('detailRequested')}
          value={format.dateTime(new Date(booking.createdAt), {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
        />
      </div>

      {booking.notes && (
        <div className='bg-brand-50 rounded-brand p-3'>
          <AppText size='caption' tone='muted' className='block'>
            {t('detailNotes')}
          </AppText>
          <AppText size='body-sm' className='block whitespace-pre-wrap wrap-break-word'>
            {booking.notes}
          </AppText>
        </div>
      )}

      <div className='flex flex-wrap gap-2'>
        <AppButton
          type='primary'
          onClick={onApprove}
          loading={pending === 'approve'}
          disabled={(busy && pending !== 'approve') || expired}
        >
          {t('approve')}
        </AppButton>
        <AppButton danger onClick={onReject} loading={pending === 'reject'} disabled={busy && pending !== 'reject'}>
          {t('reject')}
        </AppButton>
      </div>
    </li>
  )
}

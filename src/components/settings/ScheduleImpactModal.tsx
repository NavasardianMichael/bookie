'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { TimeFormat } from '@interfaces/schedule'
import { ROUTES } from '@constants/routes'
import { ScheduleImpact } from '@helpers/scheduleConflicts'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { inTimeZone } from '@helpers/timeZone'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  impact: ScheduleImpact | null
  timeZone?: string
  timeFormat: TimeFormat
  /** Awaited by the dialog — go ahead anyway. */
  onConfirm: () => Promise<void>
  onCancel: () => void
  /** The question and its buttons, where the change is not a Publish (the assistant's Apply). */
  copy?: { title: string; confirm: string; cancel: string }
}

/** Bookings named in full before the list folds into "and N more". */
const SHOWN_BOOKINGS = 5

/**
 * What publishing these hours (or applying an assistant's proposal) does to what already depends on them: services that lose days or
 * can no longer be booked at all, and upcoming bookings left outside the hours. Nothing is
 * cancelled or changed — the provider decides whether to publish, and reaches each booking from
 * `/bookings` if they want to move it.
 */
export const ScheduleImpactModal: FC<Props> = ({ impact, timeZone, timeFormat, onConfirm, onCancel, copy }) => {
  const t = useTranslations('Settings.availability.impact')
  const format = getTimeDisplayFormat(timeFormat)
  const shown = impact?.bookingsOutside.slice(0, SHOWN_BOOKINGS) ?? []
  const more = (impact?.bookingsOutside.length ?? 0) - shown.length

  return (
    <AppConfirmModal
      open={impact !== null}
      tone='warning'
      title={copy?.title ?? t('title')}
      description={t('body')}
      okText={copy?.confirm ?? t('publishAnyway')}
      cancelText={copy?.cancel ?? t('keepEditing')}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {impact && (
        <div className='mt-3 flex flex-col gap-3'>
          {impact.unbookable.length > 0 && (
            <div>
              <AppText size='body-sm' className='block font-semibold'>
                {t('unbookable')}
              </AppText>
              <AppText size='body-sm' tone='muted' className='block'>
                {impact.unbookable.join(', ')}
              </AppText>
            </div>
          )}
          {impact.narrowed.length > 0 && (
            <div>
              <AppText size='body-sm' className='block font-semibold'>
                {t('narrowed')}
              </AppText>
              <AppText size='body-sm' tone='muted' className='block'>
                {impact.narrowed.join(', ')}
              </AppText>
            </div>
          )}
          {impact.bookingsOutside.length > 0 && (
            <div>
              <AppText size='body-sm' className='block font-semibold'>
                {t('bookingsOutside', { count: impact.bookingsOutside.length })}
              </AppText>
              <ul className='m-0 list-disc ps-5'>
                {shown.map((booking) => (
                  <li key={booking.id}>
                    <AppText size='body-sm'>
                      {inTimeZone(booking.start, timeZone).format(`ddd D MMM, ${format}`)} · {booking.serviceName} ·{' '}
                      {booking.clientName}
                    </AppText>
                  </li>
                ))}
              </ul>
              {more > 0 && (
                <AppText size='body-sm' tone='muted'>
                  {t('andMore', { count: more })}
                </AppText>
              )}
              <AppText size='body-sm' tone='muted' className='mt-1 block'>
                {t.rich('bookingsKept', { link: (chunks) => <AppLink href={ROUTES.bookings}>{chunks}</AppLink> })}
              </AppText>
            </div>
          )}
        </div>
      )}
    </AppConfirmModal>
  )
}

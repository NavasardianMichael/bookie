'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { TimeFormat } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { AvailabilityDayRow } from '@components/settings/AvailabilityDayRow'
import { AppParagraph } from '@components/ui/bare/AppParagraph'

type Props = {
  timeFormat: TimeFormat
}

/** The Availability tab's weekly hours, in the same editor. Pausing bookings stays on the tab. */
export const AvailabilityStep: FC<Props> = ({ timeFormat }) => {
  const t = useTranslations('Settings')

  return (
    <div className='flex flex-col gap-3'>
      <AppParagraph size='body-sm' className='m-0'>
        {t('availability.recurringBody')}
      </AppParagraph>
      {WEEK_DAYS_LIST.map((day) => (
        <AvailabilityDayRow key={day} day={day} name={['days']} timeFormat={timeFormat} />
      ))}
    </div>
  )
}

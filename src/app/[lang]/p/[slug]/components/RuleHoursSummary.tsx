import { FC } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { ProviderScheduleRule } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { getHourCycle, scheduleTimeToDate } from '@helpers/timeFormat'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTime } from '@components/ui/bare/AppTime'

type Props = {
  rule: Exclude<ProviderScheduleRule, { mode: 'weekdays' }>
  timeFormat?: TimeFormat
}

/**
 * The provider's hours when they do not follow a week: the days of the month and their one set
 * of hours ("Each month on days 1, 15 and the last day · 09:00 – 17:00"), or — under the
 * specific-dates rule — that only the dates listed below are open. Printed on the provider's own
 * clock. antd-free, so it is in the HTML a crawler reads.
 */
export const RuleHoursSummary: FC<Props> = ({ rule, timeFormat }) => {
  const t = useTranslations('Provider')
  const format = useFormatter()

  if (rule.mode === 'dates') {
    return (
      <AppParagraph size='caption' className='m-0'>
        {t('byDates')}
      </AppParagraph>
    )
  }

  const hourCycle = getHourCycle(timeFormat)
  const time = (value: string): string =>
    format.dateTime(scheduleTimeToDate(value), { hour: '2-digit', minute: '2-digit', hourCycle, timeZone: 'UTC' })
  const days = [...rule.days.map(String), ...(rule.lastDay ? [t('lastDay')] : [])]

  return (
    <div className='flex flex-col gap-1'>
      <AppParagraph size='caption' className='m-0'>
        {t('monthlyDays', { days: format.list(days, { type: 'conjunction' }) })}
      </AppParagraph>
      <span className='text-caption flex flex-col'>
        {splitScheduleIntoParts(rule.hours).map((part) => (
          <span key={`${part.start}-${part.end}`} className='whitespace-nowrap'>
            <AppTime dateTime={part.start}>{time(part.start)}</AppTime>
            {' – '}
            <AppTime dateTime={part.end}>{time(part.end)}</AppTime>
          </span>
        ))}
      </span>
    </div>
  )
}

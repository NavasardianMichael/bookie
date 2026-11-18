import { FC } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { SpecialDate } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { addDaysToDayKey } from '@helpers/serviceAvailability'
import { getHourCycle, scheduleTimeToDate } from '@helpers/timeFormat'
import { dayKeyOf } from '@helpers/timeZone'
import { AppDescriptionList, AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'

type Props = {
  specialDates?: SpecialDate[]
  timeZone?: string
  timeFormat?: TimeFormat
  /** In place of "Special dates" — "Open dates" when they are the only open days. */
  heading?: string
}

/** How far ahead the page names special dates. Further out, the booking calendar shows them. */
const SHOWN_DAYS = 30

/** `YYYY-MM-DD` as a `Date` at UTC midnight, for an `Intl` date formatter told `timeZone: 'UTC'`. */
const dayToDate = (dayKey: string): Date => new Date(`${dayKey}T00:00:00Z`)

/**
 * The provider's special dates in the next month — days off, days on other hours, and days closed
 * for part of the time ("Closed 12:00 – 14:00") — under the usual hours, so the page says what
 * the booking calendar already follows. Printed on the provider's own clock. antd-free, so it is
 * in the HTML a crawler reads. Nothing when there are none.
 */
export const SpecialHoursList: FC<Props> = ({ specialDates, timeZone, timeFormat, heading }) => {
  const t = useTranslations('Provider')
  const tCommon = useTranslations('Common')
  const format = useFormatter()
  const today = dayKeyOf(new Date(), timeZone)
  const until = addDaysToDayKey(today, SHOWN_DAYS)
  const upcoming = (specialDates ?? []).filter((entry) => entry.to >= today && entry.from <= until)
  if (!upcoming.length) return null

  const hourCycle = getHourCycle(timeFormat)
  const time = (value: string): string =>
    format.dateTime(scheduleTimeToDate(value), { hour: '2-digit', minute: '2-digit', hourCycle, timeZone: 'UTC' })
  const day = (dayKey: string): string =>
    format.dateTime(dayToDate(dayKey), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

  const items: AppDescriptionListItem[] = upcoming.map((entry) => {
    const parts = entry.hours ? splitScheduleIntoParts(entry.hours) : []
    const ranges = parts.map((part) => (
      <span key={`${part.start}-${part.end}`} className='whitespace-nowrap'>
        <AppTime dateTime={part.start}>{time(part.start)}</AppTime>
        {' – '}
        <AppTime dateTime={part.end}>{time(part.end)}</AppTime>
      </span>
    ))
    return {
      key: entry.from,
      label: entry.from === entry.to ? day(entry.from) : `${day(entry.from)} – ${day(entry.to)}`,
      value: (
        <span className='flex flex-col'>
          {entry.kind === 'open' && ranges}
          {entry.kind === 'closed' && !parts.length && <AppText tone='muted'>{tCommon('closed')}</AppText>}
          {entry.kind === 'closed' && parts.length > 0 && (
            <>
              <AppText tone='muted'>{t('closedDuring')}</AppText>
              {ranges}
            </>
          )}
          {entry.note && (
            <AppText size='caption' tone='muted'>
              {entry.note}
            </AppText>
          )}
        </span>
      ),
    }
  })

  return (
    <div className='mt-4 flex flex-col gap-2'>
      <AppText size='body-sm' className='font-semibold'>
        {heading ?? t('specialDates')}
      </AppText>
      {/* One column, as the weekly list above: the page's side column has no room for two. */}
      <AppDescriptionList items={items} columns={1} size='caption' />
    </div>
  )
}

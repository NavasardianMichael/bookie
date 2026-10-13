'use client'

import { FC, useSyncExternalStore } from 'react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { hasWeekScheduleHours, splitScheduleIntoParts } from '@helpers/schedule'
import { getHourCycle, scheduleTimeToDate } from '@helpers/timeFormat'
import { dayKeyOf, fixedOffsetZone, formatTimeZoneName, formatUtcOffset, weekdayInSameWeek, zonedTimeToDate } from '@helpers/timeZone'
import { AppDescriptionList, AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { getPublicClock, getServerPublicClock, subscribePublicClock } from './publicClock'

type Props = {
  weekSchedule: WeekSchedule
  /**
   * The zone these hours are written in. Omitted for a provider who never set one:
   * the hours are then the visitor's own, and the offset control is not offered.
   */
  timeZone?: string
  /** 12- or 24-hour, as the provider chose. Absent: the page locale's convention. */
  timeFormat?: TimeFormat
  /**
   * When the visitor picks an offset or a 12/24-hour clock, reprint these hours on
   * that same clock. Off when the provider hid the controls: the list stays theirs.
   */
  followVisitorClock?: boolean
  columns?: 1 | 2
}

const minutesOf = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

/**
 * Opening hours as a `<dl>`, from the same `splitScheduleIntoParts` the calendar
 * uses — so a day with a lunch break reads as two ranges here exactly as it does
 * in the slot grid.
 *
 * The first render is the provider's own clock, and that is the HTML a crawler
 * reads. A client component still server-renders that first pass. After the
 * visitor picks an offset or a 12/24-hour clock, the same list reprints on it,
 * including a weekday when the shift lands on the day before or after.
 * `<time datetime>` keeps the stored `'HH:mm'` whichever clock is shown.
 */
export const WorkingHours: FC<Props> = ({
  weekSchedule,
  timeZone,
  timeFormat,
  followVisitorClock = false,
  columns = 1,
}) => {
  const tDays = useTranslations('Settings.availability.days')
  const tCommon = useTranslations('Common')
  const tBooking = useTranslations('Booking')
  const format = useFormatter()
  const locale = useLocale()
  const clock = useSyncExternalStore(subscribePublicClock, getPublicClock, getServerPublicClock)
  const offsetHours = followVisitorClock ? clock.offsetHours : null
  const hourCycle = getHourCycle(followVisitorClock && clock.timeFormat ? clock.timeFormat : timeFormat)
  const referenceDayKey =
    clock.referenceDayKey ?? (timeZone ? dayKeyOf(new Date(), timeZone) : null)

  if (!hasWeekScheduleHours(weekSchedule)) return null

  const formatWall = (day: WeekDay, value: string): string => {
    if (!timeZone || offsetHours === null || !referenceDayKey) {
      return format.dateTime(scheduleTimeToDate(value), {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle,
        timeZone: 'UTC',
      })
    }

    const dayKey = weekdayInSameWeek(referenceDayKey, day)
    const instant = zonedTimeToDate(dayKey, minutesOf(value), timeZone)
    const displayZone = fixedOffsetZone(offsetHours)
    const text = format.dateTime(instant, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle,
      timeZone: displayZone,
    })
    const shownKey = dayKeyOf(instant, displayZone)
    if (shownKey === dayKey) return text
    const shift = shownKey > dayKey ? 1 : -1
    const shownDay = WEEK_DAYS_LIST[(WEEK_DAYS_LIST.indexOf(day) + shift + 7) % 7]
    return `${tDays(shownDay)}, ${text}`
  }

  const items: AppDescriptionListItem[] = WEEK_DAYS_LIST.map((day) => {
    const parts = splitScheduleIntoParts(weekSchedule[day])

    return {
      key: day,
      label: tDays(day),
      value: parts.length ? (
        <span className='flex flex-col'>
          {parts.map((part) => (
            <span key={`${part.start}-${part.end}`} className='whitespace-nowrap'>
              <AppTime dateTime={part.start}>{formatWall(day, part.start)}</AppTime>
              {' – '}
              <AppTime dateTime={part.end}>{formatWall(day, part.end)}</AppTime>
            </span>
          ))}
        </span>
      ) : (
        <AppText tone='muted'>{tCommon('closed')}</AppText>
      ),
    }
  })

  const zoneLabel = !timeZone
    ? null
    : offsetHours === null
      ? formatTimeZoneName(timeZone, locale)
      : formatUtcOffset(fixedOffsetZone(offsetHours), locale)

  return (
    <>
      <AppDescriptionList items={items} columns={columns} size='caption' />
      {zoneLabel && (
        <AppParagraph size='caption' className='m-0 mt-3'>
          {tBooking('timesShownIn', { zone: zoneLabel })}
        </AppParagraph>
      )}
    </>
  )
}

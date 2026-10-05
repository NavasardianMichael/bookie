import { getFormatter, getTranslations } from 'next-intl/server'
import { WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { currentLocale } from '@i18n/metadata'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { hasWeekScheduleHours, splitScheduleIntoParts } from '@helpers/schedule'
import { getHourCycle, scheduleTimeToDate } from '@helpers/timeFormat'
import { formatTimeZoneName } from '@helpers/timeZone'
import { AppDescriptionList, AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'

type Props = {
  weekSchedule: WeekSchedule
  /**
   * The zone these hours are on, named under the list — "09:00" means nothing to a reader
   * abroad until it says whose 09:00. Omitted for a provider who never set one: the server
   * cannot know the visitor's zone, which is the one their hours are read in then.
   */
  timeZone?: string
  /** 12- or 24-hour, as the slot grid prints them. Absent: the page locale's convention. */
  timeFormat?: TimeFormat
  columns?: 1 | 2
}

/**
 * Opening hours as a `<dl>`, from the same `splitScheduleIntoParts` the calendar
 * uses — so a day with a lunch break reads as two ranges here exactly as it does
 * in the slot grid, rather than overstating availability.
 *
 * Server-rendered on purpose: the schedule reached the page as a prop but was only
 * ever consumed inside the client calendar, so "when is this provider open" — one
 * of the two questions every local-business search asks — was absent from the
 * markup entirely. The times go through next-intl's `Intl` formatter rather than dayjs,
 * whose locale is a client-only global; `<time datetime>` keeps the machine-readable
 * `HH:mm` whichever clock is shown.
 */
export const WorkingHours = async ({ weekSchedule, timeZone, timeFormat, columns = 1 }: Props) => {
  if (!hasWeekScheduleHours(weekSchedule)) return null

  const [tDays, tCommon, tBooking, format, locale] = await Promise.all([
    getTranslations('Settings.availability.days'),
    getTranslations('Common'),
    getTranslations('Booking'),
    getFormatter(),
    currentLocale(),
  ])

  // 2-digit hours match the slot grid's `hh:mm A` / `HH:mm`. UTC because the carrier's UTC
  // fields are the wall-clock time; the provider's zone is named under the list instead.
  const formatTime = (value: string): string =>
    format.dateTime(scheduleTimeToDate(value), {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: getHourCycle(timeFormat),
      timeZone: 'UTC',
    })

  const items: AppDescriptionListItem[] = WEEK_DAYS_LIST.map((day) => {
    const parts = splitScheduleIntoParts(weekSchedule[day])

    return {
      key: day,
      label: tDays(day),
      value: parts.length ? (
        <span className='flex flex-col'>
          {parts.map((part) => (
            <span key={`${part.start}-${part.end}`}>
              <AppTime dateTime={part.start}>{formatTime(part.start)}</AppTime>
              {' – '}
              <AppTime dateTime={part.end}>{formatTime(part.end)}</AppTime>
            </span>
          ))}
        </span>
      ) : (
        <AppText tone='muted'>{tCommon('closed')}</AppText>
      ),
    }
  })

  return (
    <>
      <AppDescriptionList items={items} columns={columns} />
      {timeZone && (
        <AppParagraph size='body-sm' className='m-0 mt-3'>
          {tBooking('timesShownIn', { zone: formatTimeZoneName(timeZone, locale) })}
        </AppParagraph>
      )}
    </>
  )
}

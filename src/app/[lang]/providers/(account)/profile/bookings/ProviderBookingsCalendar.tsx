'use client'

import { FC, useCallback, useMemo } from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { buildMonthCells, buildWeekdayLabels } from '@helpers/calendar'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'

export type DayBookingCount = {
  total: number
  live: number
}

type Props = {
  /** Any day inside the visible month. */
  month: Dayjs
  /** `DAY_KEY_FORMAT` key of the filtered day, or null when the whole range is shown. */
  selectedDayKey: string | null
  /** Counts per `DAY_KEY_FORMAT` key, as the API returned them for this month. */
  countsByDay: Record<string, DayBookingCount>
  loading?: boolean
  /** Re-clicking the selected day clears the filter, so this receives `null`. */
  onSelectDay: (dayKey: string | null) => void
  onMonthChange: (month: Dayjs) => void
}

/**
 * The month grid for a provider's booking **history**, sharing its cell arithmetic with
 * the public `BookingMonth` through `@helpers/calendar` but almost none of its rules.
 *
 * Three deliberate differences from the booking calendar, each following from history
 * rather than availability:
 *
 * 1. **Every day is selectable, past included, and paging backwards is unlimited.**
 *    `BookingMonth` disables both because nobody books yesterday. Yesterday is precisely
 *    what this screen is for.
 * 2. **A day with no bookings is enabled, not disabled.** Selecting it is a legitimate
 *    question with a legitimate empty answer, and the list below says so.
 * 3. **The badge is a count, not a dot.** How busy a day was is the information; whether
 *    it was bookable at all is not.
 *
 * Re-clicking the selected day clears the filter rather than reselecting it, so the
 * grid is a toggle and there is no separate "show all days" control to keep in step.
 */
export const ProviderBookingsCalendar: FC<Props> = ({
  month,
  selectedDayKey,
  countsByDay,
  loading,
  onSelectDay,
  onMonthChange,
}) => {
  const t = useTranslations('Settings.bookings')

  const cells = useMemo(() => buildMonthCells(month), [month])
  const weekdayLabels = useMemo(() => buildWeekdayLabels(), [])

  // Read once per mount rather than once per cell: the clock in a 42-iteration loop is
  // 42 reads of an answer that cannot change mid-render.
  const todayKey = useMemo(() => dayjs().format(DAY_KEY_FORMAT), [])

  const handlePrev = useCallback(
    () => onMonthChange(month.subtract(1, 'month').startOf('month')),
    [month, onMonthChange]
  )
  const handleNext = useCallback(
    () => onMonthChange(month.add(1, 'month').startOf('month')),
    [month, onMonthChange]
  )

  const handleDayClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { day } = event.currentTarget.dataset
      if (!day) return
      onSelectDay(day === selectedDayKey ? null : day)
    },
    [onSelectDay, selectedDayKey]
  )

  return (
    <Surface padding='none' className='overflow-hidden'>
      <div className='border-brand-border flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-6'>
        <div className='min-w-0'>
          <AppTitle level='h2' size='h3'>
            {month.format('MMMM YYYY')}
          </AppTitle>
          <AppParagraph size='body-sm' className='m-0'>
            {selectedDayKey ? t('calendarFiltered') : t('calendarHint')}
          </AppParagraph>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          {selectedDayKey && <AppButton onClick={() => onSelectDay(null)}>{t('clearDay')}</AppButton>}
          <AppButton aria-label={t('previousMonth')} icon={<LeftOutlined />} onClick={handlePrev} />
          <AppButton aria-label={t('nextMonth')} icon={<RightOutlined />} onClick={handleNext} />
        </div>
      </div>

      <div className='p-5 sm:p-6'>
        {/* `gap-px` over a tinted ground paints the hairline rules between cells without
            a border on each of the 35+ of them. */}
        <div
          role='group'
          aria-label={t('calendarLabel')}
          aria-busy={loading}
          className='border-brand-border-subtle bg-brand-border-subtle rounded-brand grid grid-cols-7 gap-px overflow-hidden border'
        >
          {weekdayLabels.map(({ day, label }) => (
            <div key={day} className='bg-surface-sunken py-2 text-center sm:py-3'>
              <AppText size='overline' tone='muted'>
                {label}
              </AppText>
            </div>
          ))}

          {cells.map(({ key, date, isOutside }) => {
            const count = countsByDay[key]
            const isSelected = key === selectedDayKey
            const isToday = key === todayKey

            return (
              <button
                key={key}
                type='button'
                data-day={key}
                onClick={handleDayClick}
                aria-pressed={isSelected}
                aria-label={`${date.format('dddd, D MMMM')} — ${t('bookingCount', { count: count?.total ?? 0 })}`}
                className={cn(
                  'bg-surface flex h-16 w-full cursor-pointer flex-col items-start gap-1 p-2 text-start transition-colors sm:h-24',
                  'focus-visible:ring-brand/40 focus-visible:z-1 focus-visible:ring-2 focus-visible:outline-none',
                  !isSelected && 'hover:bg-brand-50',
                  isSelected && 'bg-brand ring-brand ring-2 ring-inset',
                  // Outside days stay clickable — a booking on the 1st is still a booking
                  // when the grid is showing the previous month — but recede.
                  isOutside && !isSelected && 'bg-surface-sunken'
                )}
              >
                <span
                  className={cn(
                    'text-body-sm',
                    isSelected
                      ? 'font-bold text-white'
                      : isOutside
                        ? 'text-brand-300'
                        : isToday
                          ? 'text-brand font-bold'
                          : 'text-brand-text font-medium'
                  )}
                >
                  {date.date()}
                </span>

                {!!count?.total && (
                  <span
                    className={cn(
                      'mt-auto rounded-brand-sm px-1.5 py-0.5 text-caption font-semibold',
                      isSelected ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand'
                    )}
                  >
                    {count.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Surface>
  )
}

'use client'

import { FC, useCallback, useMemo } from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { isOpenOnDate } from '@helpers/booking'
import { buildMonthCells, buildWeekdayLabels } from '@helpers/calendar'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  /** Any day inside the visible month. */
  month: Dayjs
  /** `DAY_KEY_FORMAT` key of the picked day, or null before anything is picked. */
  selectedDayKey: string | null
  /** Open slots per `DAY_KEY_FORMAT` key, so a day can show whether it is bookable at all. */
  slotCountByDay: Map<string, number>
  weekSchedule?: WeekSchedule
  /** Named in the subtitle — the date is being picked *for* a service. */
  serviceName?: string
  onSelectDay: (dayKey: string) => void
  onMonthChange: (month: Dayjs) => void
}

/**
 * The month grid from `public_provider_profile`: a day is picked in place and the
 * open times for it render in `BookingSlots` below.
 *
 * A day with no open slots is `disabled` rather than hidden — an empty Tuesday is
 * information, and dropping it would reflow the grid out of its weekday columns.
 * Disabled cells do not fire hover, so the reason tooltip wraps a span, not the button.
 *
 * Days travel as `DAY_KEY_FORMAT` strings, not `Date`s: that is already the key
 * `countSlotsByDay` returns, and it keeps date parsing to the single call site
 * that needs a real `Date` (`BookingPanel`, feeding `getSlotsForDate`).
 */
export const BookingMonth: FC<Props> = ({
  month,
  selectedDayKey,
  slotCountByDay,
  weekSchedule,
  serviceName,
  onSelectDay,
  onMonthChange,
}) => {
  const t = useTranslations('Common')
  const tBooking = useTranslations('Booking')
  const cells = useMemo(() => buildMonthCells(month), [month])

  const weekdayLabels = useMemo(() => buildWeekdayLabels(), [])

  const today = useMemo(() => dayjs().startOf('day'), [])
  const todayKey = today.format(DAY_KEY_FORMAT)
  // The provider cannot be booked in the past, so there is nothing to page back to.
  const canGoBack = month.startOf('month').isAfter(today, 'month')
  const isCurrentMonth = month.isSame(today, 'month')

  const handlePrev = useCallback(
    () => onMonthChange(month.subtract(1, 'month').startOf('month')),
    [month, onMonthChange]
  )
  const handleNext = useCallback(() => onMonthChange(month.add(1, 'month').startOf('month')), [month, onMonthChange])
  const handleToday = useCallback(() => {
    onMonthChange(today.startOf('month'))
    onSelectDay(todayKey)
  }, [onMonthChange, onSelectDay, today, todayKey])

  const handleDayClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { day } = event.currentTarget.dataset
      if (day) onSelectDay(day)
    },
    [onSelectDay]
  )

  return (
    <Surface padding='none' className='overflow-hidden'>
      <div className='border-brand-border flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-6'>
        <div className='min-w-0'>
          <AppTitle level='h3' size='h3'>
            {month.format('MMMM YYYY')}
          </AppTitle>
          <AppParagraph size='body-sm' className='m-0'>
            {serviceName ? `Pick a date for your ${serviceName}` : 'Pick a date to see the open times'}
          </AppParagraph>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <AppButton disabled={isCurrentMonth} onClick={handleToday}>
            {t('today')}
          </AppButton>
          <AppButton
            icon={<LeftOutlined />}
            aria-label='Previous month'
            disabled={!canGoBack}
            onClick={handlePrev}
          />
          <AppButton icon={<RightOutlined />} aria-label='Next month' onClick={handleNext} />
        </div>
      </div>

      <div className='p-5 sm:p-6'>
        {/* `gap-px` over a tinted ground paints the hairline rules the mockup draws
            between cells, without a border on every one of the 35+ cells. */}
        <div
          role='group'
          aria-label='Choose a date'
          className='border-brand-border-subtle bg-brand-border-subtle grid grid-cols-7 gap-px overflow-hidden rounded-brand border'
        >
          {weekdayLabels.map(({ day, label }) => (
            <div key={day} className='bg-surface-sunken py-2 text-center sm:py-3'>
              <AppText size='overline' tone='muted'>
                {label}
              </AppText>
            </div>
          ))}

          {cells.map(({ key, date, isOutside }) => {
            const count = slotCountByDay.get(key) ?? 0
            const isPast = date.isBefore(today, 'day')
            const isClosed = !isOpenOnDate(weekSchedule, date)
            const isSelected = key === selectedDayKey
            const isToday = date.isSame(today, 'day')
            const disabled = isOutside || isPast || !count
            const disableReason = isOutside
              ? undefined
              : isPast
                ? tBooking('dayPast')
                : isClosed
                  ? tBooking('dayClosed')
                  : !count
                    ? tBooking('dayNoSlots')
                    : undefined

            const cell = (
              <button
                type='button'
                data-day={key}
                onClick={handleDayClick}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={`${date.format('dddd, D MMMM')}${count ? `, ${count} open` : `, ${disableReason ?? 'no open times'}`}`}
                className={cn(
                  'bg-surface flex h-full w-full flex-col items-start gap-1 p-2 text-start transition-colors',
                  'focus-visible:ring-brand/40 focus-visible:z-1 focus-visible:ring-2 focus-visible:outline-none',
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  !disabled && !isSelected && 'hover:bg-brand-50',
                  isSelected && 'bg-brand ring-brand ring-2 ring-inset'
                )}
              >
                <span
                  className={cn(
                    'text-body-sm',
                    isSelected
                      ? 'font-bold text-white'
                      : disabled
                        ? 'text-brand-300'
                        : isToday
                          ? 'text-brand font-bold'
                          : 'text-brand-text font-medium'
                  )}
                >
                  {date.date()}
                </span>

                {!disabled && (
                  <span
                    aria-hidden
                    title={`${count} open`}
                    className={cn(
                      'mt-auto h-1 w-full shrink-0 rounded-full',
                      isSelected ? 'bg-white/40' : 'bg-brand-200'
                    )}
                  />
                )}
              </button>
            )

            return (
              <Tooltip key={key} title={disableReason}>
                <span className='flex h-16 sm:h-24'>{cell}</span>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </Surface>
  )
}

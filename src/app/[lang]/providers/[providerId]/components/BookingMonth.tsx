'use client'

import { FC, useCallback, useMemo } from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { isOpenOnDate } from '@helpers/booking'
import { buildMonthCells, buildWeekdayLabels } from '@helpers/calendar'
import { cn } from '@helpers/cn'
import { calendarDayOf } from '@helpers/timeZone'
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
  /**
   * The provider's IANA zone. "Today" — the highlighted cell, the Today button, the point the
   * grid will not page back past — is the provider's today, which near midnight is not the
   * visitor's. Absent: the runtime's zone.
   */
  timeZone?: string
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
 * The leading and trailing days borrowed from the neighbouring months follow the same
 * rule, so the first days of next month are bookable from this one. Picking one pages
 * the grid to its month — `BookingPanel.handleSelectDay` does that, not this grid.
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
  timeZone,
  serviceName,
  onSelectDay,
  onMonthChange,
}) => {
  const t = useTranslations('Common')
  const tBooking = useTranslations('Booking')
  const cells = useMemo(() => buildMonthCells(month), [month])

  const weekdayLabels = useMemo(() => buildWeekdayLabels(), [])

  // Fresh each render — never `useMemo(..., [])`. That froze the SSR clock (UTC in Node)
  // into the client bundle, so in UTC+4 after midnight UTC the button's "today" was
  // still yesterday and never matched the selected local day.
  const today = calendarDayOf(new Date(), timeZone)
  const todayKey = today.format(DAY_KEY_FORMAT)
  // The provider cannot be booked in the past, so there is nothing to page back to.
  const canGoBack = month.startOf('month').isAfter(today, 'month')
  // Only the selected day matters — not which month is on screen.
  const isOnToday = selectedDayKey === todayKey

  const handlePrev = useCallback(
    () => onMonthChange(month.subtract(1, 'month').startOf('month')),
    [month, onMonthChange]
  )
  const handleNext = useCallback(() => onMonthChange(month.add(1, 'month').startOf('month')), [month, onMonthChange])
  const handleToday = useCallback(() => {
    const nextToday = calendarDayOf(new Date(), timeZone)
    onMonthChange(nextToday.startOf('month'))
    onSelectDay(nextToday.format(DAY_KEY_FORMAT))
  }, [onMonthChange, onSelectDay, timeZone])

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
            {serviceName ? tBooking('pickDateForService', { service: serviceName }) : tBooking('pickDate')}
          </AppParagraph>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <AppButton disabled={isOnToday} onClick={handleToday}>
            {t('today')}
          </AppButton>
          <AppButton
            icon={<LeftOutlined />}
            aria-label={t('previousMonth')}
            disabled={!canGoBack}
            onClick={handlePrev}
          />
          <AppButton icon={<RightOutlined />} aria-label={t('nextMonth')} onClick={handleNext} />
        </div>
      </div>

      <div className='p-5 sm:p-6'>
        {/* `gap-px` over a tinted ground paints the hairline rules the mockup draws
            between cells, without a border on every one of the 35+ cells. */}
        <div
          role='group'
          aria-label={tBooking('chooseDate')}
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
            const disabled = isPast || !count
            const disableReason = isPast
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
                aria-label={`${date.format('dddd, D MMMM')}${count ? `, ${tBooking('openCount', { count })}` : `, ${disableReason ?? tBooking('noOpenTimesShort')}`}`}
                className={cn(
                  'bg-surface flex h-full w-full flex-col items-start gap-1 p-2 text-start transition-colors',
                  'focus-visible:ring-brand/40 focus-visible:z-1 focus-visible:ring-2 focus-visible:outline-none',
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  !disabled && !isSelected && 'hover:bg-brand-50',
                  isSelected && 'bg-brand ring-brand ring-2 ring-inset',
                  // Days borrowed from the neighbouring months stay pickable but recede.
                  isOutside && !isSelected && 'bg-surface-sunken'
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
                    title={tBooking('openCount', { count })}
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

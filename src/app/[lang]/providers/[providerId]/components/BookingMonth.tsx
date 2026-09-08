'use client'

import { FC, useCallback, useMemo } from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { DAY_KEY_FORMAT } from '@constants/schedule'
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
  /** Named in the subtitle — the date is being picked *for* a service. */
  serviceName?: string
  onSelectDay: (dayKey: string) => void
  onMonthChange: (month: Dayjs) => void
}

/** Monday-first, matching `WEEK_DAYS_LIST` and every schedule in the app. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type Cell = {
  key: string
  date: Dayjs
  isOutside: boolean
}

const buildCells = (month: Dayjs): Cell[] => {
  const start = month.startOf('month')
  // dayjs `day()` is Sunday-first; shift so Monday is column 0.
  const leading = (start.day() + 6) % 7
  const gridStart = start.subtract(leading, 'day')
  const total = Math.ceil((leading + month.daysInMonth()) / 7) * 7

  return Array.from({ length: total }, (_, index) => {
    const date = gridStart.add(index, 'day')
    return { key: date.format(DAY_KEY_FORMAT), date, isOutside: !date.isSame(start, 'month') }
  })
}

/**
 * The month grid from `public_provider_profile`: a day is picked in place and the
 * open times for it render in `BookingSlots` below.
 *
 * This replaces a FullCalendar month view whose day click opened a modal of
 * slots. Two things went wrong with that: the day and the time lived on
 * different layers, so nothing ever showed both at once, and a mis-tap on a day
 * was a dialog rather than a selection.
 *
 * A day with no open slots is `disabled` rather than hidden — an empty Tuesday is
 * information, and dropping it would reflow the grid out of its weekday columns.
 *
 * Days travel as `DAY_KEY_FORMAT` strings, not `Date`s: that is already the key
 * `countSlotsByDay` returns, and it keeps date parsing to the single call site
 * that needs a real `Date` (`BookingPanel`, feeding `getSlotsForDate`).
 */
export const BookingMonth: FC<Props> = ({
  month,
  selectedDayKey,
  slotCountByDay,
  serviceName,
  onSelectDay,
  onMonthChange,
}) => {
  const t = useTranslations('Common')
  const cells = useMemo(() => buildCells(month), [month])

  const weekdayLabels = useMemo(() => WEEKDAY_ORDER.map((day) => ({ day, label: dayjs().day(day).format('ddd') })), [])

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
            const isSelected = key === selectedDayKey
            const isToday = date.isSame(today, 'day')
            const disabled = isOutside || isPast || !count

            return (
              <button
                key={key}
                type='button'
                data-day={key}
                onClick={handleDayClick}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={`${date.format('dddd, D MMMM')}${count ? `, ${count} open` : ', no open times'}`}
                className={cn(
                  'bg-surface flex h-16 flex-col items-start gap-1 p-2 text-start transition-colors sm:h-24 sm:p-3',
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
                      : isOutside || isPast
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
          })}
        </div>
      </div>
    </Surface>
  )
}

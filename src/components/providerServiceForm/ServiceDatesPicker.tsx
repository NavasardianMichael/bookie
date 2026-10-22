'use client'

import { FC, useMemo, useState } from 'react'
import { CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { MAX_SERVICE_DATES } from '@constants/serviceAvailability'
import { isOpenOnDate } from '@helpers/booking'
import { buildMonthCells, buildWeekdayLabels } from '@helpers/calendar'
import { cn } from '@helpers/cn'
import { calendarDayOf } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'

dayjs.extend(customParseFormat)

type Props = {
  /** The provider's published hours: a day they are closed cannot be picked. */
  weekSchedule?: WeekSchedule
  /** The provider's zone — "today", and so what counts as past, is theirs. */
  timeZone?: string
  /** Injected by the wrapping `Form.Item`. `YYYY-MM-DD` keys. */
  value?: string[]
  onChange?: (value: string[]) => void
}

/**
 * The specific dates a service is offered on: a month grid where a click adds or removes a
 * day, and the picked days listed beneath, each with its own remove button.
 *
 * Shares `buildMonthCells` with `BookingMonth` and the bookings calendar — the maths, not the
 * markup (`src/helpers/calendar.ts`). Past days and days the provider is closed are disabled;
 * the hours on a picked day are the provider's. Dates already gone are dropped on the next
 * change and are not listed.
 *
 * A control-contract field (`forms` skill): the wrapping `Form.Item` owns the value.
 */
export const ServiceDatesPicker: FC<Props> = ({ weekSchedule, timeZone, value = [], onChange }) => {
  const t = useTranslations('Services.availability')
  const tCommon = useTranslations('Common')
  const today = calendarDayOf(new Date(), timeZone)
  const todayKey = today.format(DAY_KEY_FORMAT)
  const upcoming = useMemo(() => [...value].filter((date) => date >= todayKey).sort(), [todayKey, value])

  const [month, setMonth] = useState<Dayjs>(() =>
    (upcoming[0] ? dayjs(upcoming[0], DAY_KEY_FORMAT) : today).startOf('month')
  )
  const cells = useMemo(() => buildMonthCells(month), [month])
  const weekdayLabels = useMemo(() => buildWeekdayLabels('dd'), [])
  const selected = new Set(upcoming)
  const canGoBack = month.isAfter(today, 'month')
  const atLimit = upcoming.length >= MAX_SERVICE_DATES

  const toggle = (dayKey: string): void => {
    const next = selected.has(dayKey) ? upcoming.filter((date) => date !== dayKey) : [...upcoming, dayKey]
    onChange?.(next.sort())
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='border-brand-border flex flex-col gap-3 rounded-brand border p-4'>
        <div className='flex items-center justify-between gap-2'>
          <AppText className='font-bold'>{month.format('MMMM YYYY')}</AppText>
          <div className='flex gap-2'>
            <AppButton
              size='small'
              icon={<LeftOutlined />}
              aria-label={tCommon('previousMonth')}
              disabled={!canGoBack}
              onClick={() => setMonth(month.subtract(1, 'month'))}
            />
            <AppButton
              size='small'
              icon={<RightOutlined />}
              aria-label={tCommon('nextMonth')}
              onClick={() => setMonth(month.add(1, 'month'))}
            />
          </div>
        </div>

        <div role='group' aria-label={t('datesCalendar')} className='grid grid-cols-7 gap-1'>
          {weekdayLabels.map(({ day, label }) => (
            <AppText key={day} size='overline' tone='muted' className='py-1 text-center'>
              {label}
            </AppText>
          ))}

          {cells.map(({ key, date, isOutside }) => {
            const isSelected = selected.has(key)
            const disabled = date.isBefore(today, 'day') || !isOpenOnDate(weekSchedule, date) || (atLimit && !isSelected)

            return (
              <button
                key={key}
                type='button'
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={date.format('dddd, D MMMM YYYY')}
                onClick={() => toggle(key)}
                className={cn(
                  'text-body-sm flex aspect-square items-center justify-center rounded-brand transition-colors',
                  'focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none',
                  isSelected
                    ? 'bg-brand cursor-pointer font-bold text-white'
                    : disabled
                      ? 'text-brand-300 cursor-not-allowed'
                      : 'text-brand-text hover:bg-brand-50 cursor-pointer font-medium',
                  isOutside && !isSelected && 'opacity-60',
                  key === todayKey && !isSelected && 'ring-brand-200 ring-1 ring-inset'
                )}
              >
                {date.date()}
              </button>
            )
          })}
        </div>
      </div>

      {upcoming.length ? (
        <ul aria-label={t('datesSelected')} className='m-0 flex list-none flex-wrap gap-2 p-0'>
          {upcoming.map((dayKey) => (
            <li
              key={dayKey}
              className='border-brand-border bg-surface-sunken flex items-center gap-1 rounded-full border py-0.5 ps-3 pe-1'
            >
              <AppText size='body-sm'>{dayjs(dayKey, DAY_KEY_FORMAT).format('ddd, D MMM YYYY')}</AppText>
              <AppButton
                type='text'
                size='small'
                shape='circle'
                icon={<CloseOutlined />}
                aria-label={t('removeDate', { date: dayjs(dayKey, DAY_KEY_FORMAT).format('D MMMM YYYY') })}
                onClick={() => toggle(dayKey)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <AppText size='body-sm' tone='muted'>
          {t('datesEmpty')}
        </AppText>
      )}
    </div>
  )
}

'use client'

import { FC, ReactNode } from 'react'
import { Checkbox } from 'antd'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { ROUTES } from '@constants/routes'
import { SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { cn } from '@helpers/cn'
import { splitScheduleIntoParts } from '@helpers/schedule'
import { hasDayHours } from '@helpers/serviceAvailability'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'

dayjs.extend(customParseFormat)

type Props = {
  /** The provider's published hours — the only time frame a service has. */
  weekSchedule?: WeekSchedule
  timeFormat: TimeFormat
  /** Injected by the wrapping `Form.Item`. */
  value?: WeekDay[]
  onChange?: (value: WeekDay[]) => void
}

/**
 * The weekdays a service is offered on, in the Availability tab's day-card look — but with
 * no time pickers: on a ticked day the service runs during the provider's own hours, which
 * each card shows read-only. A day the provider is closed cannot be ticked.
 *
 * A control-contract field (`forms` skill): the wrapping `Form.Item` owns the value.
 */
export const ServiceWeekdaysField: FC<Props> = ({ weekSchedule, timeFormat, value = [], onChange }) => {
  const t = useTranslations('Services.availability')
  const tSettings = useTranslations('Settings')
  const displayFormat = getTimeDisplayFormat(timeFormat)

  // A new tab: leaving the sheet here would drop whatever the provider has typed into it.
  const availabilityLink = (chunks: ReactNode): ReactNode => (
    <AppLink href={ROUTES.providerProfileAvailability} target='_blank'>
      {chunks}
    </AppLink>
  )

  const toggle = (day: WeekDay, checked: boolean): void => {
    const next = checked ? [...value, day] : value.filter((current) => current !== day)
    onChange?.(WEEK_DAYS_LIST.filter((current) => next.includes(current)))
  }

  const hoursOf = (day: WeekDay): string =>
    splitScheduleIntoParts(weekSchedule![day])
      .map(
        (part) =>
          `${dayjs(part.start, SCHEDULE_VALUE_FORMAT).format(displayFormat)}–${dayjs(part.end, SCHEDULE_VALUE_FORMAT).format(displayFormat)}`
      )
      .join(', ')

  return (
    <div className='flex flex-col gap-3'>
      {WEEK_DAYS_LIST.map((day) => {
        const open = hasDayHours(weekSchedule, day)
        const checked = open && value.includes(day)

        return (
          <div
            key={day}
            className={cn(
              'border-brand-border flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-brand border p-4',
              checked ? 'bg-surface-sunken' : 'border-dashed'
            )}
          >
            <Checkbox checked={checked} disabled={!open} onChange={(event) => toggle(day, event.target.checked)}>
              <span className={cn('text-body-sm font-semibold', !checked && 'text-brand-muted')}>
                {tSettings(`availability.days.${day}`)}
              </span>
            </Checkbox>
            <AppText size='body-sm' tone='muted' className={cn(!open && 'italic')}>
              {open ? hoursOf(day) : t.rich('closedDay', { link: availabilityLink })}
            </AppText>
          </div>
        )
      })}
    </div>
  )
}

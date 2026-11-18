'use client'

import { FC } from 'react'
import { Checkbox, Form } from 'antd'
import { useTranslations } from 'next-intl'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppText } from '@components/ui/bare/AppText'
import { TimeRangesField } from './TimeRangesField'

type Props = {
  day: WeekDay
  /** Where the week's `ScheduleDaysForm` sits in the surrounding form — `['days']` on the tab. */
  name: (string | number)[]
  timeFormat: TimeFormat
}

/**
 * One weekday of the availability editor: open or closed, and up to `MAX_DAY_RANGES` bookable
 * windows. Lives inside an antd `Form` holding a `ScheduleDaysForm` at `name`; convert with
 * `weekScheduleToDayForms` / `dayFormsToWeekSchedule`. The windows are `TimeRangesField`, the
 * same editor a special date and a service's own hours use.
 */
export const AvailabilityDayRow: FC<Props> = ({ day, name, timeFormat }) => {
  const t = useTranslations('Settings')
  const form = Form.useFormInstance()
  const open = Form.useWatch([...name, day, 'open'], form)

  return (
    <div
      className={`border-brand-border flex flex-col gap-3 rounded-brand border p-4 ${
        open ? 'bg-surface-sunken' : 'border-dashed'
      }`}
    >
      <AppFormItem name={[...name, day, 'open']} valuePropName='checked' className='m-0'>
        <Checkbox>
          <span className={`font-bold text-body-sm ${open ? '' : 'text-brand-muted'}`}>
            {t(`availability.days.${day}`)}
          </span>
        </Checkbox>
      </AppFormItem>

      {open ? (
        <TimeRangesField name={[...name, day, 'ranges']} timeFormat={timeFormat} />
      ) : (
        <AppText tone='muted' className='italic'>
          {t('availability.unavailable')}
        </AppText>
      )}
    </div>
  )
}

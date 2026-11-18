'use client'

import { FC } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Form, TimePicker } from 'antd'
import { useTranslations } from 'next-intl'
import { TimeFormat } from '@interfaces/schedule'
import { MAX_DAY_RANGES } from '@constants/schedule'
import { defaultScheduleRange } from '@helpers/schedule'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  /** Where the `ScheduleRangeForm[]` sits in the surrounding form. */
  name: (string | number)[]
  timeFormat: TimeFormat
}

/**
 * Up to `MAX_DAY_RANGES` from–to windows, as `ScheduleRangeForm[]` under `name` in the
 * surrounding antd `Form`. The one editor for a time of day range: a weekday on the
 * Availability tab (`AvailabilityDayRow`), a special date, and a service's own hours.
 */
export const TimeRangesField: FC<Props> = ({ name, timeFormat }) => {
  const t = useTranslations('Settings')
  const pickerFormat = getTimeDisplayFormat(timeFormat)

  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <div className='flex flex-col gap-3'>
          {fields.map((field) => (
            <div key={field.key} className='flex flex-wrap items-center gap-2'>
              <AppFormItem name={[field.name, 'start']} className='m-0'>
                <TimePicker className='min-w-40' format={pickerFormat} minuteStep={15} needConfirm={false} />
              </AppFormItem>
              <AppText tone='muted'>{t('availability.to')}</AppText>
              <AppFormItem name={[field.name, 'end']} className='m-0'>
                <TimePicker className='min-w-40' format={pickerFormat} minuteStep={15} needConfirm={false} />
              </AppFormItem>
              {fields.length > 1 && (
                <AppButton
                  type='text'
                  aria-label={t('availability.removeRange')}
                  icon={<DeleteOutlined />}
                  onClick={() => remove(field.name)}
                />
              )}
            </div>
          ))}
          {fields.length < MAX_DAY_RANGES && (
            <AppButton
              type='dashed'
              className='self-start'
              size='small'
              icon={<PlusOutlined />}
              onClick={() => add(defaultScheduleRange())}
            >
              {t('availability.addRange')}
            </AppButton>
          )}
        </div>
      )}
    </Form.List>
  )
}

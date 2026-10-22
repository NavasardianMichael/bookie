'use client'

import { FC } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Checkbox, Form, TimePicker } from 'antd'
import { useTranslations } from 'next-intl'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { MAX_DAY_RANGES } from '@constants/schedule'
import { defaultScheduleRange } from '@helpers/schedule'
import { getTimeDisplayFormat } from '@helpers/timeFormat'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  day: WeekDay
  /** Where the week's `ScheduleDaysForm` sits in the surrounding form — `['days']` on the tab. */
  name: (string | number)[]
  timeFormat: TimeFormat
}

/**
 * One weekday of the availability editor: open or closed, and up to `MAX_DAY_RANGES` bookable
 * windows. Lives inside an antd `Form` holding a `ScheduleDaysForm` at `name`; convert with
 * `weekScheduleToDayForms` / `dayFormsToWeekSchedule`. The Availability tab and the profile
 * assistant's review both render it, so the two edit hours the same way.
 */
export const AvailabilityDayRow: FC<Props> = ({ day, name, timeFormat }) => {
  const t = useTranslations('Settings')
  const form = Form.useFormInstance()
  const open = Form.useWatch([...name, day, 'open'], form)
  const pickerFormat = getTimeDisplayFormat(timeFormat)

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
        <Form.List name={[...name, day, 'ranges']}>
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
      ) : (
        <AppText tone='muted' className='italic'>
          {t('availability.unavailable')}
        </AppText>
      )}
    </div>
  )
}

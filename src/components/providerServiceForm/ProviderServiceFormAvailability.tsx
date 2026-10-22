'use client'

import { FC, useId, useMemo } from 'react'
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { Form, Segmented, Select } from 'antd'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { ProviderServiceFormValues, ServiceAvailabilityMode, ServiceRecurrence } from '@interfaces/services'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import {
  MONTH_DAYS,
  SERVICE_AVAILABILITY_MODES,
  SERVICE_AVAILABILITY_MODES_LIST,
  SERVICE_RECURRENCES,
  SERVICE_RECURRENCES_LIST,
} from '@constants/serviceAvailability'
import { canEverBeBooked } from '@helpers/serviceAvailability'
import { calendarDayOf } from '@helpers/timeZone'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppText } from '@components/ui/bare/AppText'
import { PROVIDER_SERVICE_FORM_POPUP_PROPS } from './constants'
import { toServiceAvailability } from './processors'
import { ServiceDatesPicker } from './ServiceDatesPicker'
import { ServiceWeekdaysField } from './ServiceWeekdaysField'

type Props = {
  /** The provider's published hours — the only time frame any mode can offer. */
  weekSchedule?: WeekSchedule
  timeZone?: string
  timeFormat: TimeFormat
}

/** Content-wide rather than stretched across the sheet, with a floor so short labels stay tappable. */
const SEGMENTED_CLASS_NAMES = { root: 'max-w-full self-start', item: 'min-w-24' }

/** A non-empty list, with the given copy when it is empty. */
const atLeastOne = (message: string): Rule => ({
  validator: (_, value: unknown[] | undefined) =>
    value?.length ? Promise.resolve() : Promise.reject(new Error(message)),
})

/**
 * When the service can be booked: always, on recurring weekdays or days of the month, or on
 * specific dates. Every mode picks **days only** — on a picked day the service is bookable
 * during the provider's own hours, so nothing here can reach outside them.
 *
 * Binds nested paths under `availability` of `ProviderServiceForm`'s own `Form`; each mode's
 * field mounts only while that mode is picked, and the values of the others are kept, so
 * switching back and forth loses nothing.
 */
export const ProviderServiceFormAvailability: FC<Props> = ({ weekSchedule, timeZone, timeFormat }) => {
  const t = useTranslations('Services.availability')
  const titleId = useId()
  const form = Form.useFormInstance<ProviderServiceFormValues>()
  const values = Form.useWatch('availability', { form, preserve: true })
  const mode = values?.mode ?? SERVICE_AVAILABILITY_MODES.always
  const recurrence = values?.recurrence ?? SERVICE_RECURRENCES.weekdays

  const modeOptions = useMemo(
    () => SERVICE_AVAILABILITY_MODES_LIST.map((value) => ({ value, label: t(`modes.${value}`) })),
    [t]
  )
  const recurrenceOptions = useMemo(
    () => SERVICE_RECURRENCES_LIST.map((value) => ({ value, label: t(`recurrences.${value}`) })),
    [t]
  )
  const monthDayOptions = useMemo(() => MONTH_DAYS.map((day) => ({ value: day, label: String(day) })), [])

  const todayKey = calendarDayOf(new Date(), timeZone).format(DAY_KEY_FORMAT)
  const rule = toServiceAvailability(values)
  // An empty pick already has its field's own message; the warning is for a pick that
  // misses every open day.
  const picked = rule.mode === 'always' || (rule.mode === 'dates' ? rule.dates.length > 0 : rule.days.length > 0)
  const neverBookable = picked && !canEverBeBooked(weekSchedule, rule, todayKey)

  return (
    <div role='group' aria-labelledby={titleId} className='flex min-w-0 flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <AppText id={titleId} className='font-semibold'>
          {t('title')}
        </AppText>
        <AppText size='body-sm' tone='muted'>
          {t('help')}
        </AppText>
      </div>

      <AppFormItem name={['availability', 'mode']} hasFeedback={false} className='m-0'>
        <Segmented<ServiceAvailabilityMode>
          classNames={SEGMENTED_CLASS_NAMES}
          aria-label={t('title')} options={modeOptions} />
      </AppFormItem>

      {mode === SERVICE_AVAILABILITY_MODES.recurring && (
        <AppFormItem name={['availability', 'recurrence']} hasFeedback={false} className='m-0'>
          <Segmented<ServiceRecurrence>
          classNames={SEGMENTED_CLASS_NAMES}
          aria-label={t('recurrenceLabel')} options={recurrenceOptions} />
        </AppFormItem>
      )}

      {mode === SERVICE_AVAILABILITY_MODES.recurring && recurrence === SERVICE_RECURRENCES.weekdays && (
        <AppFormItem
          name={['availability', 'weekdays']}
          rules={[atLeastOne(t('pickWeekday'))]}
          hasFeedback={false}
          className='m-0'
        >
          <ServiceWeekdaysField weekSchedule={weekSchedule} timeFormat={timeFormat} />
        </AppFormItem>
      )}

      {mode === SERVICE_AVAILABILITY_MODES.recurring && recurrence === SERVICE_RECURRENCES.monthDays && (
        <AppFormItem
          name={['availability', 'monthDays']}
          label={t('monthDaysLabel')}
          extra={t('monthDaysNote')}
          rules={[atLeastOne(t('pickMonthDay'))]}
          hasFeedback={false}
          className='m-0'
        >
          <Select<number[]>
            mode='multiple'
            allowClear
            className='max-w-xs'
            placeholder={t('monthDaysPlaceholder')}
            options={monthDayOptions}
            {...PROVIDER_SERVICE_FORM_POPUP_PROPS}
          />
        </AppFormItem>
      )}

      {mode === SERVICE_AVAILABILITY_MODES.dates && (
        <AppFormItem
          name={['availability', 'dates']}
          rules={[atLeastOne(t('pickDate'))]}
          hasFeedback={false}
          className='m-0'
        >
          <ServiceDatesPicker weekSchedule={weekSchedule} timeZone={timeZone} />
        </AppFormItem>
      )}

      <AppText size='body-sm' tone={neverBookable ? 'danger' : 'muted'} className='flex items-start gap-2'>
        {neverBookable ? (
          <WarningOutlined aria-hidden className='mt-1 shrink-0' />
        ) : (
          <InfoCircleOutlined aria-hidden className='mt-1 shrink-0' />
        )}
        <span>{neverBookable ? t('neverBookable') : t('withinHours')}</span>
      </AppText>
    </div>
  )
}

'use client'

import { FC, useId, useMemo } from 'react'
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { Form, Segmented, Switch } from 'antd'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { ProviderScheduleRule, SpecialDate, WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { ProviderServiceFormValues, ServiceAvailabilityMode, ServiceRecurrence } from '@interfaces/services'
import { DAY_KEY_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import {
  SERVICE_AVAILABILITY_MODES,
  SERVICE_AVAILABILITY_MODES_LIST,
  SERVICE_RECURRENCES,
  SERVICE_RECURRENCES_LIST,
} from '@constants/serviceAvailability'
import { canEverBeBooked } from '@helpers/serviceAvailability'
import { calendarDayOf } from '@helpers/timeZone'
import { MonthDaysField, MonthDaysPick } from '@components/settings/MonthDaysField'
import { TimeRangesField } from '@components/settings/TimeRangesField'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppText } from '@components/ui/bare/AppText'
import { toServiceAvailability } from './processors'
import { ServiceDatesPicker } from './ServiceDatesPicker'
import { ServiceExceptionsField } from './ServiceExceptionsField'
import { ServiceWeekdaysField } from './ServiceWeekdaysField'

type Props = {
  /** The provider's published hours — the frame every mode is cut to. */
  weekSchedule?: WeekSchedule
  /** The provider's dates that do not follow the rule. */
  specialDates?: SpecialDate[]
  /** The base of the provider's hours — weekly, days of the month, or specific dates. */
  scheduleRule?: ProviderScheduleRule
  timeZone?: string
  timeFormat: TimeFormat
}

/** Content-wide rather than stretched across the sheet, with a floor so short labels stay tappable. */
const SEGMENTED_CLASS_NAMES = { root: 'max-w-full self-start', item: 'min-w-24' }

/** One set of hours for every day, or each weekday its own. */
type HoursSplit = 'same' | 'perDay'

/** A non-empty list, with the given copy when it is empty. */
const atLeastOne = (message: string): Rule => ({
  validator: (_, value: unknown[] | undefined) =>
    value?.length ? Promise.resolve() : Promise.reject(new Error(message)),
})

/** At least one day of the month, or the last day. */
const atLeastOneMonthDay = (message: string): Rule => ({
  validator: (_, value: MonthDaysPick | undefined) =>
    value?.days.length || value?.lastDay ? Promise.resolve() : Promise.reject(new Error(message)),
})

/** The form's `perDayHours` boolean as a two-way choice of labelled options (control contract). */
const HoursSplitField: FC<{
  label: string
  options: { value: HoursSplit; label: string }[]
  value?: boolean
  onChange?: (perDay: boolean) => void
}> = ({ label, options, value, onChange }) => (
  <Segmented<HoursSplit>
    classNames={SEGMENTED_CLASS_NAMES}
    aria-label={label}
    options={options}
    value={value ? 'perDay' : 'same'}
    onChange={(next) => onChange?.(next === 'perDay')}
  />
)

/**
 * When the service can be booked: always, on recurring weekdays or days of the month (with the
 * last day, and what a short month does), or on specific dates — optionally only at hours of
 * its own (one set, or each weekday its own), and with dates added or excluded on top. The
 * provider's hours stay the frame: a service is only ever bookable where its days and hours
 * meet them. A pick that reaches outside them is allowed here and raised on save
 * (`ServiceConflictSheet`).
 *
 * Binds nested paths under `availability` of `ProviderServiceForm`'s own `Form`; each mode's
 * field mounts only while that mode is picked, and the values of the others are kept, so
 * switching back and forth loses nothing.
 */
export const ProviderServiceFormAvailability: FC<Props> = ({
  weekSchedule,
  specialDates,
  scheduleRule,
  timeZone,
  timeFormat,
}) => {
  const t = useTranslations('Services.availability')
  const tSettings = useTranslations('Settings.availability')
  const titleId = useId()
  const form = Form.useFormInstance<ProviderServiceFormValues>()
  const values = Form.useWatch('availability', { form, preserve: true })
  const mode = values?.mode ?? SERVICE_AVAILABILITY_MODES.always
  const recurrence = values?.recurrence ?? SERVICE_RECURRENCES.weekdays
  const limitHours = values?.limitHours ?? false
  const weekly = mode === SERVICE_AVAILABILITY_MODES.recurring && recurrence === SERVICE_RECURRENCES.weekdays
  const perDayHours = weekly && (values?.perDayHours ?? false)
  const tickedWeekdays: WeekDay[] = WEEK_DAYS_LIST.filter((day) => values?.weekdays?.includes(day))

  const modeOptions = useMemo(
    () => SERVICE_AVAILABILITY_MODES_LIST.map((value) => ({ value, label: t(`modes.${value}`) })),
    [t]
  )
  const recurrenceOptions = useMemo(
    () => SERVICE_RECURRENCES_LIST.map((value) => ({ value, label: t(`recurrences.${value}`) })),
    [t]
  )

  const todayKey = calendarDayOf(new Date(), timeZone).format(DAY_KEY_FORMAT)
  const rule = toServiceAvailability(values)
  // An empty pick already has its field's own message; the warning is for a pick that
  // misses every open day.
  const picked =
    rule.mode === 'always' ||
    (rule.mode === 'dates' ? rule.dates.length > 0 : rule.days.length > 0 || (rule.mode === 'monthDays' && Boolean(rule.lastDay)))
  const neverBookable = picked && !canEverBeBooked(weekSchedule, rule, todayKey, specialDates, scheduleRule)

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
        <Segmented<ServiceAvailabilityMode> classNames={SEGMENTED_CLASS_NAMES} aria-label={t('title')} options={modeOptions} />
      </AppFormItem>

      {mode === SERVICE_AVAILABILITY_MODES.recurring && (
        <AppFormItem name={['availability', 'recurrence']} hasFeedback={false} className='m-0'>
          <Segmented<ServiceRecurrence>
            classNames={SEGMENTED_CLASS_NAMES}
            aria-label={t('recurrenceLabel')}
            options={recurrenceOptions}
          />
        </AppFormItem>
      )}

      {weekly && (
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
        <div className='border-brand-border flex flex-col gap-4 rounded-brand border p-4'>
          <AppFormItem
            name={['availability', 'monthDays']}
            label={t('monthDaysLabel')}
            rules={[atLeastOneMonthDay(t('pickMonthDay'))]}
            hasFeedback={false}
            className='m-0'
          >
            <MonthDaysField label={t('monthDaysLabel')} />
          </AppFormItem>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex flex-col'>
              <AppText size='body-sm' className='font-semibold'>
                {tSettings('schedule.shortMonths')}
              </AppText>
              <AppText size='body-sm' tone='muted'>
                {tSettings('schedule.shortMonthsHelp')}
              </AppText>
            </div>
            <AppFormItem name={['availability', 'shortLast']} valuePropName='checked' hasFeedback={false} className='m-0'>
              <Switch aria-label={tSettings('schedule.shortMonths')} />
            </AppFormItem>
          </div>
        </div>
      )}

      {mode === SERVICE_AVAILABILITY_MODES.dates && (
        <AppFormItem
          name={['availability', 'dates']}
          rules={[atLeastOne(t('pickDate'))]}
          hasFeedback={false}
          className='m-0'
        >
          <ServiceDatesPicker
            weekSchedule={weekSchedule}
            specialDates={specialDates}
            scheduleRule={scheduleRule}
            timeZone={timeZone}
          />
        </AppFormItem>
      )}

      <div className='border-brand-border flex flex-col gap-3 rounded-brand border p-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex flex-col'>
            <AppText className='font-semibold'>{t('hoursTitle')}</AppText>
            <AppText size='body-sm' tone='muted'>
              {t('hoursHelp')}
            </AppText>
          </div>
          <AppFormItem name={['availability', 'limitHours']} valuePropName='checked' hasFeedback={false} className='m-0'>
            <Switch aria-label={t('hoursTitle')} />
          </AppFormItem>
        </div>

        {limitHours && weekly && (
          <AppFormItem name={['availability', 'perDayHours']} hasFeedback={false} className='m-0'>
            <HoursSplitField
              label={t('hoursSplitLabel')}
              options={[
                { value: 'same', label: t('hoursSame') },
                { value: 'perDay', label: t('hoursPerDay') },
              ]}
            />
          </AppFormItem>
        )}

        {limitHours && !perDayHours && <TimeRangesField name={['availability', 'hours']} timeFormat={timeFormat} />}

        {limitHours &&
          perDayHours &&
          (tickedWeekdays.length ? (
            tickedWeekdays.map((day) => (
              <div key={day} className='bg-surface-sunken flex flex-col gap-2 rounded-brand p-3'>
                <AppText size='body-sm' className='font-semibold'>
                  {tSettings(`days.${day}`)}
                </AppText>
                <TimeRangesField
                  name={['availability', 'hoursByDay', day]}
                  timeFormat={timeFormat}
                  requiredMessage={tSettings('special.hoursRequired')}
                />
              </div>
            ))
          ) : (
            <AppText size='body-sm' tone='muted'>
              {t('pickWeekday')}
            </AppText>
          ))}
      </div>

      <AppFormItem name={['availability', 'exceptions']} hasFeedback={false} className='m-0'>
        <ServiceExceptionsField timeFormat={timeFormat} timeZone={timeZone} />
      </AppFormItem>

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

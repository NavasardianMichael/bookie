'use client'

import { FC } from 'react'
import { Form, Segmented, Switch } from 'antd'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { ProviderScheduleRule } from '@store/providers/profile/types'
import { ScheduleDaysForm, ScheduleRangeForm, TimeFormat } from '@interfaces/schedule'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { daySchedulesToRangeForms, rangeFormsToDaySchedule } from '@helpers/schedule'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppText } from '@components/ui/bare/AppText'
import { AvailabilityDayRow } from './AvailabilityDayRow'
import { MonthDaysField, MonthDaysPick } from './MonthDaysField'
import { TimeRangesField } from './TimeRangesField'

/** Repeating hours, or specific dates only. */
export type SchedulePattern = 'recurring' | 'dates'

/** How recurring hours repeat. */
export type ScheduleRecurrence = 'weekdays' | 'monthDays'

/** The rule's part of the Availability tab's form. Every pattern's values are kept while another is shown. */
export type ScheduleRuleForm = {
  pattern: SchedulePattern
  recurrence: ScheduleRecurrence
  days: ScheduleDaysForm
  monthDays: { pick: MonthDaysPick; shortLast: boolean; ranges: ScheduleRangeForm[] }
}

/** A stored rule as the form holds it; the weekly rows come from `weekSchedule` separately. */
export const scheduleRuleToForm = (rule: ProviderScheduleRule | undefined): Omit<ScheduleRuleForm, 'days'> => ({
  pattern: rule?.mode === 'dates' ? 'dates' : 'recurring',
  recurrence: rule?.mode === 'monthDays' ? 'monthDays' : 'weekdays',
  monthDays:
    rule?.mode === 'monthDays'
      ? {
          pick: { days: rule.days, ...(rule.lastDay ? { lastDay: true } : {}) },
          shortLast: rule.shortMonths === 'last',
          ranges: daySchedulesToRangeForms(rule.hours),
        }
      : { pick: { days: [] }, shortLast: false, ranges: daySchedulesToRangeForms(null) },
})

/**
 * The form back to a rule. Days of the month without complete hours have no rule to give —
 * validation stops the save before it gets here.
 */
export const formToScheduleRule = (values: Omit<ScheduleRuleForm, 'days'>): ProviderScheduleRule | null => {
  if (values.pattern === 'dates') return { mode: 'dates' }
  if (values.recurrence === 'weekdays') return { mode: 'weekdays' }
  const hours = rangeFormsToDaySchedule(values.monthDays.ranges)
  if (!hours) return null
  return {
    mode: 'monthDays',
    days: values.monthDays.pick.days,
    ...(values.monthDays.pick.lastDay ? { lastDay: true } : {}),
    ...(values.monthDays.shortLast ? { shortMonths: 'last' as const } : {}),
    hours,
  }
}

/** The fields to validate before saving the rule — only the shown pattern's. */
export const scheduleRuleFieldsToValidate = (values: Omit<ScheduleRuleForm, 'days'>): (string | number)[][] =>
  values.pattern === 'recurring' && values.recurrence === 'monthDays'
    ? [
        ['monthDays', 'pick'],
        ['monthDays', 'ranges'],
      ]
    : []

/** Content-wide rather than stretched across the surface, with a floor so short labels stay tappable. */
const SEGMENTED_CLASS_NAMES = { root: 'max-w-full self-start', item: 'min-w-28' }

type Props = {
  timeFormat: TimeFormat
}

/**
 * How the provider's hours repeat — the Availability tab's rule, bound under the tab's own `Form`:
 *
 * - **Recurring → Weekdays**: each weekday open or closed, with its own windows (`weekSchedule`);
 * - **Recurring → Days of the month**: days 1–31 and the last day, one set of hours, and whether
 *   a short month moves a missing day to its last day or skips it;
 * - **Specific days**: no recurring hours at all — the tab shows the open dates editor instead.
 *
 * The weekly rows stay in the form under every pattern, so switching back loses nothing — the
 * API keeps `weekSchedule` under every rule for the same reason.
 */
export const ProviderScheduleRuleFields: FC<Props> = ({ timeFormat }) => {
  const t = useTranslations('Settings.availability.schedule')
  const form = Form.useFormInstance<ScheduleRuleForm>()
  const pattern = Form.useWatch('pattern', form) ?? 'recurring'
  const recurrence = Form.useWatch('recurrence', form) ?? 'weekdays'

  const pickRule: Rule = {
    validator: (_, value: MonthDaysPick | undefined) =>
      value?.days.length || value?.lastDay ? Promise.resolve() : Promise.reject(new Error(t('pickMonthDay'))),
  }

  return (
    <div className='flex flex-col gap-4'>
      <AppFormItem name='pattern' hasFeedback={false} className='m-0'>
        <Segmented<SchedulePattern>
          classNames={SEGMENTED_CLASS_NAMES}
          aria-label={t('patternLabel')}
          options={[
            { value: 'recurring', label: t('patterns.recurring') },
            { value: 'dates', label: t('patterns.dates') },
          ]}
        />
      </AppFormItem>

      {pattern === 'recurring' && (
        <AppFormItem name='recurrence' hasFeedback={false} className='m-0'>
          <Segmented<ScheduleRecurrence>
            classNames={SEGMENTED_CLASS_NAMES}
            aria-label={t('recurrenceLabel')}
            options={[
              { value: 'weekdays', label: t('recurrences.weekdays') },
              { value: 'monthDays', label: t('recurrences.monthDays') },
            ]}
          />
        </AppFormItem>
      )}

      {pattern === 'recurring' && recurrence === 'weekdays' && (
        <div className='flex flex-col gap-3'>
          {WEEK_DAYS_LIST.map((day) => (
            <AvailabilityDayRow key={day} day={day} name={['days']} timeFormat={timeFormat} />
          ))}
        </div>
      )}

      {pattern === 'recurring' && recurrence === 'monthDays' && (
        <div className='bg-surface-sunken border-brand-border flex flex-col gap-4 rounded-brand border p-4'>
          <AppFormItem
            name={['monthDays', 'pick']}
            layout='vertical'
            label={t('monthDays')}
            extra={t('monthDaysHelp')}
            rules={[pickRule]}
            hasFeedback={false}
            className='m-0'
          >
            <MonthDaysField label={t('monthDays')} />
          </AppFormItem>

          <div className='flex items-start justify-between gap-4'>
            <div className='flex flex-col'>
              <AppText size='body-sm' className='font-semibold'>
                {t('shortMonths')}
              </AppText>
              <AppText size='body-sm' tone='muted'>
                {t('shortMonthsHelp')}
              </AppText>
            </div>
            <AppFormItem name={['monthDays', 'shortLast']} valuePropName='checked' className='m-0'>
              <Switch aria-label={t('shortMonths')} />
            </AppFormItem>
          </div>

          <div className='flex flex-col gap-2'>
            <AppText size='body-sm' className='font-semibold'>
              {t('monthHours')}
            </AppText>
            <TimeRangesField name={['monthDays', 'ranges']} timeFormat={timeFormat} requiredMessage={t('hoursRequired')} />
          </div>
        </div>
      )}
    </div>
  )
}

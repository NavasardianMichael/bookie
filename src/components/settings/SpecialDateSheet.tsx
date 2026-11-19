'use client'

import { FC, useState } from 'react'
import { DatePicker, Form, Segmented } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { ExceptionKind, SpecialDate } from '@store/providers/profile/types'
import { ScheduleRangeForm, TimeFormat } from '@interfaces/schedule'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { daySchedulesToRangeForms, rangeFormsToDaySchedule } from '@helpers/schedule'
import { MAX_SPECIAL_DATE_SPAN_DAYS, overlappingSpecialDate, SPECIAL_DATE_NOTE_MAX } from '@helpers/specialDates'
import { calendarDayOf } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppSheet } from '@components/ui/AppSheet'
import { AppText } from '@components/ui/bare/AppText'
import { TimeRangesField } from './TimeRangesField'

/**
 * Where a date entry lives — and so what it means. The first three are the provider's own
 * (`Provider.specialDates`, the Availability tab); the `service…` pair is a service's
 * (`availability.exceptions`, the service form), always inside the provider's hours.
 */
export type SpecialDateSection = 'added' | 'excluded' | 'openDates' | 'serviceAdded' | 'serviceExcluded'

type Props = {
  open: boolean
  section: SpecialDateSection
  /** The entry being edited, or `undefined` to add one. */
  entry?: SpecialDate
  /** Every entry, of both kinds, so an overlap is refused here rather than by the API. */
  entries: readonly SpecialDate[]
  timeFormat: TimeFormat
  timeZone?: string
  onClose: () => void
  onSave: (entry: SpecialDate) => void
}

/**
 * An excluded date: the whole day, or only some hours of it. A service's added date: the
 * provider's hours that day, or only some hours of them.
 */
type Span = 'allDay' | 'someHours'

type FormValues = {
  range: [Dayjs, Dayjs]
  span: Span
  ranges: ScheduleRangeForm[]
  note?: string
}

/** An excluded date closes; an added or open date opens. */
export const kindOfSection = (section: SpecialDateSection): ExceptionKind =>
  section === 'excluded' || section === 'serviceExcluded' ? 'closed' : 'open'

/** A service's own dates rather than the provider's. */
export const isServiceSection = (section: SpecialDateSection): boolean =>
  section === 'serviceAdded' || section === 'serviceExcluded'

const toForm = (entry: SpecialDate | undefined, today: Dayjs): FormValues => ({
  range: entry ? [dayjs(entry.from, DAY_KEY_FORMAT), dayjs(entry.to, DAY_KEY_FORMAT)] : [today, today],
  span: entry?.hours ? 'someHours' : 'allDay',
  ranges: daySchedulesToRangeForms(entry?.hours),
  note: entry?.note,
})

/**
 * Add or edit one date or run of dates, in the section it belongs to:
 *
 * - **added** / **open dates** — open on the hours given here, which replace the usual ones;
 * - **excluded** — closed all day, or closed only during the hours given here;
 * - **a service's added date** — offered on the provider's hours that day, or only some of them;
 * - **a service's excluded date** — not offered that day, or not during the hours given here.
 *
 * The provider's own dates carry an optional note visitors see ("Holiday"). Writes into the
 * owning form's state only — its own save is what stores it.
 */
export const SpecialDateSheet: FC<Props> = ({ open, section, entry, entries, timeFormat, timeZone, onClose, onSave }) => {
  const t = useTranslations('Settings.availability')
  const tCommon = useTranslations('Common')
  const [form] = Form.useForm<FormValues>()
  const today = calendarDayOf(new Date(), timeZone)
  const [initialValues] = useState(() => toForm(entry, today))
  const span = Form.useWatch('span', form) ?? initialValues.span
  const kind = kindOfSection(section)
  const forService = isServiceSection(section)
  // An added date of the provider's needs hours; every other entry may be the whole day.
  const spanChoice = kind === 'closed' || forService
  const withHours = !spanChoice || span === 'someHours'
  const hoursHelp = forService
    ? t(kind === 'open' ? 'special.serviceOpenHoursHelp' : 'special.serviceClosedHoursHelp')
    : t(kind === 'open' ? 'special.openHoursHelp' : 'special.someHoursHelp')

  const submit = (values: FormValues): void => {
    const [start, end] = values.range
    const note = values.note?.trim()
    onSave({
      from: start.format(DAY_KEY_FORMAT),
      to: end.format(DAY_KEY_FORMAT),
      kind,
      hours: withHours ? rangeFormsToDaySchedule(values.ranges) : null,
      ...(note ? { note } : {}),
    })
  }

  return (
    <AppSheet open={open} onClose={onClose} title={t(`dates.${section}.${entry ? 'editTitle' : 'addTitle'}`)}>
      <Form<FormValues> form={form} layout='vertical' initialValues={initialValues} onFinish={submit} className='flex flex-col gap-4'>
        <AppFormItem
          name='range'
          label={t('special.dates')}
          rules={[
            { required: true, message: t('special.datesRequired') },
            {
              validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                if (!value) return Promise.resolve()
                const [start, end] = value
                if (end.diff(start, 'day') >= MAX_SPECIAL_DATE_SPAN_DAYS) {
                  return Promise.reject(new Error(t('special.tooLong', { days: MAX_SPECIAL_DATE_SPAN_DAYS })))
                }
                const clash = overlappingSpecialDate(
                  entries,
                  { from: start.format(DAY_KEY_FORMAT), to: end.format(DAY_KEY_FORMAT) },
                  entry?.from
                )
                return clash ? Promise.reject(new Error(t('special.overlap'))) : Promise.resolve()
              },
            },
          ]}
        >
          <DatePicker.RangePicker className='w-full' disabledDate={(date) => date.isBefore(today, 'day')} allowClear={false} />
        </AppFormItem>

        {spanChoice && (
          <AppFormItem name='span' hasFeedback={false} className='m-0'>
            <Segmented<Span>
              aria-label={t('special.spanLabel')}
              options={[
                { value: 'allDay', label: t(kind === 'open' ? 'special.usualHours' : 'special.allDay') },
                { value: 'someHours', label: t('special.someHours') },
              ]}
            />
          </AppFormItem>
        )}

        {withHours && (
          <div className='flex flex-col gap-2'>
            <AppText size='body-sm' tone='muted'>
              {hoursHelp}
            </AppText>
            <TimeRangesField name={['ranges']} timeFormat={timeFormat} requiredMessage={t('special.hoursRequired')} />
          </div>
        )}

        {/* Only the provider's own dates are shown to visitors with a note. */}
        {!forService && (
          <AppFormItem name='note' label={t('special.note')} extra={t('special.noteHint')}>
            <AppInput maxLength={SPECIAL_DATE_NOTE_MAX} placeholder={t('special.notePlaceholder')} />
          </AppFormItem>
        )}

        <div className='flex justify-end gap-2'>
          <AppButton onClick={onClose}>{tCommon('cancel')}</AppButton>
          <AppButton type='primary' htmlType='submit'>
            {tCommon('done')}
          </AppButton>
        </div>
      </Form>
    </AppSheet>
  )
}

'use client'

import { FC, useState } from 'react'
import { DatePicker, Form, Segmented } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { SpecialDate } from '@store/providers/profile/types'
import { ScheduleRangeForm, TimeFormat } from '@interfaces/schedule'
import { DAY_KEY_FORMAT, SCHEDULE_VALUE_FORMAT } from '@constants/schedule'
import { defaultScheduleRange, rangesToDaySchedule, splitScheduleIntoParts } from '@helpers/schedule'
import { MAX_SPECIAL_DATE_SPAN_DAYS, overlappingSpecialDate, SPECIAL_DATE_NOTE_MAX } from '@helpers/specialDates'
import { calendarDayOf } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppSheet } from '@components/ui/AppSheet'
import { TimeRangesField } from './TimeRangesField'

type Props = {
  open: boolean
  /** The entry being edited, or `undefined` to add one. */
  entry?: SpecialDate
  /** Every entry, so an overlap is refused here rather than by the API. */
  entries: readonly SpecialDate[]
  timeFormat: TimeFormat
  timeZone?: string
  onClose: () => void
  onSave: (entry: SpecialDate) => void
}

type Kind = 'closed' | 'hours'

type FormValues = {
  range: [Dayjs, Dayjs]
  kind: Kind
  ranges: ScheduleRangeForm[]
  note?: string
}

const toForm = (entry: SpecialDate | undefined, today: Dayjs): FormValues => {
  const parts = entry?.hours ? splitScheduleIntoParts(entry.hours) : []
  return {
    range: entry ? [dayjs(entry.from, DAY_KEY_FORMAT), dayjs(entry.to, DAY_KEY_FORMAT)] : [today, today],
    kind: entry && entry.hours ? 'hours' : 'closed',
    ranges: parts.length
      ? parts.map((part) => ({ start: dayjs(part.start, SCHEDULE_VALUE_FORMAT), end: dayjs(part.end, SCHEDULE_VALUE_FORMAT) }))
      : [defaultScheduleRange()],
    note: entry?.note,
  }
}

/**
 * Add or edit one special date: a day or a run of days, closed or on hours of its own, with an
 * optional note visitors see ("Holiday"). Writes into the Availability tab's state only — the
 * tab's Save draft / Publish is what stores it.
 */
export const SpecialDateSheet: FC<Props> = ({ open, entry, entries, timeFormat, timeZone, onClose, onSave }) => {
  const t = useTranslations('Settings.availability')
  const tCommon = useTranslations('Common')
  const [form] = Form.useForm<FormValues>()
  const today = calendarDayOf(new Date(), timeZone)
  const [initialValues] = useState(() => toForm(entry, today))
  const kind = Form.useWatch('kind', form) ?? initialValues.kind

  const submit = (values: FormValues): void => {
    const [start, end] = values.range
    const hours =
      values.kind === 'hours'
        ? rangesToDaySchedule(
            values.ranges
              .filter((range) => range.start && range.end)
              .map((range) => ({ start: range.start!.format(SCHEDULE_VALUE_FORMAT), end: range.end!.format(SCHEDULE_VALUE_FORMAT) }))
          )
        : null
    const note = values.note?.trim()
    const dayHours = hours && hours.availability.start ? hours : null
    onSave({
      from: start.format(DAY_KEY_FORMAT),
      to: end.format(DAY_KEY_FORMAT),
      kind: dayHours ? 'open' : 'closed',
      hours: dayHours,
      ...(note ? { note } : {}),
    })
  }

  return (
    <AppSheet open={open} onClose={onClose} title={entry ? t('special.editTitle') : t('special.addTitle')}>
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
          <DatePicker.RangePicker
            className='w-full'
            disabledDate={(date) => date.isBefore(today, 'day')}
            allowClear={false}
          />
        </AppFormItem>

        <AppFormItem name='kind' hasFeedback={false} className='m-0'>
          <Segmented<Kind>
            aria-label={t('special.kindLabel')}
            options={[
              { value: 'closed', label: t('special.closed') },
              { value: 'hours', label: t('special.hours') },
            ]}
          />
        </AppFormItem>

        {kind === 'hours' && <TimeRangesField name={['ranges']} timeFormat={timeFormat} />}

        <AppFormItem name='note' label={t('special.note')} extra={t('special.noteHint')}>
          <AppInput maxLength={SPECIAL_DATE_NOTE_MAX} placeholder={t('special.notePlaceholder')} />
        </AppFormItem>

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

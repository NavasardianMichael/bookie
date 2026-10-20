'use client'

import { FC } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { DatePicker, FormListFieldData, Select } from 'antd'
import type { Rule } from 'antd/es/form'
import { Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_INPUT, MAX_CHARS_FOR_NAME, MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { DraftSlotCheck, formatDraftTime } from '@helpers/bookingImport'
import { cn } from '@helpers/cn'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { Surface } from '@components/ui/layout/Surface'

/** One booking as the review form holds it. `date` is the picker's value; `time` is `HH:mm`. */
export type DraftFormRow = {
  fullName?: string
  phone?: string
  serviceId?: string
  date?: Dayjs | null
  time?: string
  notes?: string
}

/** Fewer digits than this is a fragment, not a number anyone could call — as on the API. */
const MIN_PHONE_DIGITS = 5

type Props = {
  field: FormListFieldData
  index: number
  /** Why this row cannot go in as it stands; `null` when it can. */
  check: DraftSlotCheck | null
  /** Free slots for the row's service and day, `HH:mm`. */
  timeOptions: string[]
  /** The row's current time, kept visible as an option even when it is not a free slot. */
  currentTime?: string
  serviceOptions: { value: string; label: string }[]
  isDateDisabled: (date: Dayjs) => boolean
  /** `getTimeDisplayFormat` for the provider's 12/24-hour clock. */
  timeDisplayFormat: string
  onRemove: () => void
  disabled: boolean
}

/**
 * One extracted booking, every field editable in place. The time is a choice among the
 * provider's free slots rather than a free clock, so an edited row can only land where a
 * visitor could have booked; a time read off the paper that is *not* a free slot stays on
 * screen, disabled, with the reason beneath it.
 */
export const PhotoImportRow: FC<Props> = ({
  field,
  index,
  check,
  timeOptions,
  currentTime,
  serviceOptions,
  isDateDisabled,
  timeDisplayFormat,
  onRemove,
  disabled,
}) => {
  const t = useTranslations('Bookings.import')
  const nameRules = useFormItemRules('required', 'maxCharsForName')
  const requiredRules = useFormItemRules('required')
  const notesRules = useFormItemRules('maxCharsForTextarea')
  const number = index + 1
  const id = (name: string) => `import-${field.key}-${name}`

  const phoneRules: Rule[] = [
    ...requiredRules,
    {
      validator: (_rule, value?: string) =>
        !value || value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS
          ? Promise.resolve()
          : Promise.reject(new Error(t('phoneInvalid'))),
    },
  ]

  const options = [
    ...(currentTime && !timeOptions.includes(currentTime)
      ? [{ value: currentTime, label: formatDraftTime(currentTime, timeDisplayFormat), disabled: true }]
      : []),
    ...timeOptions.map((value) => ({ value, label: formatDraftTime(value, timeDisplayFormat) })),
  ]

  const issueText = check
    ? check.issue === 'clash'
      ? t('issues.clash', { number: (check.clashWith ?? 0) + 1 })
      : t(`issues.${check.issue}`)
    : null

  return (
    <Surface as='li' padding='sm' className={cn('flex flex-col gap-4', check && 'border-brand-danger')}>
      <div className='flex items-center justify-between gap-2'>
        <AppTitle level='h3' size='body'>
          {t('row', { number })}
        </AppTitle>
        <AppButton
          type='text'
          danger
          icon={<DeleteOutlined />}
          aria-label={t('remove', { number })}
          onClick={onRemove}
          disabled={disabled}
        />
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor={id('fullName')} requirement='Required'>
            {t('fullName')}
          </FieldLabel>
          <AppFormItem name={[field.name, 'fullName']} rules={nameRules} messageVariables={{ label: t('fullName') }}>
            <AppInput id={id('fullName')} autoComplete='off' maxLength={MAX_CHARS_FOR_NAME} />
          </AppFormItem>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor={id('phone')} requirement='Required'>
            {t('phone')}
          </FieldLabel>
          <AppFormItem name={[field.name, 'phone']} rules={phoneRules} messageVariables={{ label: t('phone') }}>
            <AppInput id={id('phone')} type='tel' inputMode='tel' autoComplete='off' maxLength={MAX_CHARS_FOR_INPUT} />
          </AppFormItem>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor={id('service')} requirement='Required'>
            {t('service')}
          </FieldLabel>
          <AppFormItem name={[field.name, 'serviceId']} messageVariables={{ label: t('service') }}>
            <Select id={id('service')} options={serviceOptions} placeholder={t('servicePlaceholder')} />
          </AppFormItem>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor={id('date')} requirement='Required'>
            {t('date')}
          </FieldLabel>
          <AppFormItem name={[field.name, 'date']} messageVariables={{ label: t('date') }}>
            <DatePicker id={id('date')} className='w-full' allowClear={false} inputReadOnly disabledDate={isDateDisabled} />
          </AppFormItem>
        </div>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor={id('time')} requirement='Required'>
            {t('time')}
          </FieldLabel>
          <AppFormItem name={[field.name, 'time']} messageVariables={{ label: t('time') }}>
            <Select
              id={id('time')}
              options={options}
              placeholder={t('timePlaceholder')}
              notFoundContent={t('noTimes')}
              status={check && check.issue !== 'missing' ? 'error' : undefined}
            />
          </AppFormItem>
        </div>
      </div>

      {issueText && (
        <AppParagraph size='body-sm' tone='danger' className='m-0' role='status'>
          {issueText}
        </AppParagraph>
      )}

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor={id('notes')} requirement='Optional'>
          {t('notes')}
        </FieldLabel>
        <AppFormItem name={[field.name, 'notes']} rules={notesRules} messageVariables={{ label: t('notes') }}>
          <AppTextArea id={id('notes')} autoSize={{ minRows: 1, maxRows: 3 }} maxLength={MAX_CHARS_FOR_TEXTAREA} />
        </AppFormItem>
      </div>
    </Surface>
  )
}

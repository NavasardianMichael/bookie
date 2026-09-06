'use client'

import { useEffect, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Checkbox, Form, Switch, TimePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { DaySchedule, ProviderProfile, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { MAX_DAY_RANGES, SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { processError } from '@helpers/error'
import { rangesToDaySchedule, splitScheduleIntoParts } from '@helpers/schedule'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ClockIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

dayjs.extend(customParseFormat)

type RangeForm = {
  start?: Dayjs | null
  end?: Dayjs | null
}

type DayForm = {
  open: boolean
  ranges: RangeForm[]
}

type FormValues = {
  available: boolean
  days: Record<WeekDay, DayForm>
}

const DEFAULT_START = dayjs('09:00', SCHEDULE_VALUE_FORMAT)
const DEFAULT_END = dayjs('17:00', SCHEDULE_VALUE_FORMAT)
const EMPTY_RANGE: RangeForm = { start: DEFAULT_START, end: DEFAULT_END }

/** Clone first — `splitScheduleIntoParts` mutates the caller's break objects. */
const cloneDaySchedule = (part?: DaySchedule): DaySchedule => ({
  availability: { start: part?.availability?.start ?? '', end: part?.availability?.end ?? '' },
  breaks: (part?.breaks ?? []).map((brk) => ({ ...brk })),
})

const scheduleToForm = (profile: ProviderProfile): FormValues => {
  const source = (profile.draft?.weekSchedule as WeekSchedule | undefined) ?? profile.details.weekSchedule
  const available = profile.draft?.available ?? profile.basic.available
  const days = WEEK_DAYS_LIST.reduce(
    (acc, day) => {
      const parts = splitScheduleIntoParts(cloneDaySchedule(source?.[day]))
      acc[day] = {
        open: parts.length > 0,
        ranges: parts.length
          ? parts.map((part) => ({
              start: dayjs(part.start, SCHEDULE_VALUE_FORMAT),
              end: dayjs(part.end, SCHEDULE_VALUE_FORMAT),
            }))
          : [{ ...EMPTY_RANGE }],
      }
      return acc
    },
    {} as Record<WeekDay, DayForm>
  )
  return { available, days }
}

const formToWeekSchedule = (days: Record<WeekDay, DayForm>): WeekSchedule =>
  WEEK_DAYS_LIST.reduce((acc, day) => {
    const row = days[day]
    if (!row?.open) {
      acc[day] = { availability: { start: '', end: '' }, breaks: [] }
      return acc
    }

    acc[day] = rangesToDaySchedule(
      (row.ranges ?? [])
        .filter((range) => range.start && range.end)
        .map((range) => ({
          start: range.start!.format(SCHEDULE_VALUE_FORMAT),
          end: range.end!.format(SCHEDULE_VALUE_FORMAT),
        }))
    )
    return acc
  }, {} as WeekSchedule)

const AvailabilityDayRow = ({ day }: { day: WeekDay }) => {
  const t = useTranslations('Settings')
  const form = Form.useFormInstance<FormValues>()
  const open = Form.useWatch(['days', day, 'open'], form)

  return (
    <div
      className={`border-brand-border flex flex-col gap-3 rounded-brand border p-4 ${
        open ? 'bg-surface-sunken' : 'border-dashed'
      }`}
    >
      <AppFormItem name={['days', day, 'open']} valuePropName='checked' className='m-0'>
        <Checkbox>
          <span className={`font-bold text-body-sm ${open ? '' : 'text-brand-muted'}`}>
            {t(`availability.days.${day}`)}
          </span>
        </Checkbox>
      </AppFormItem>

      {open ? (
        <Form.List name={['days', day, 'ranges']}>
          {(fields, { add, remove }) => (
            <div className='flex flex-col gap-3'>
              {fields.map((field) => (
                <div key={field.key} className='flex flex-wrap items-center gap-2'>
                  <AppFormItem name={[field.name, 'start']} className='m-0'>
                    <TimePicker format='HH:mm' minuteStep={15} needConfirm={false} />
                  </AppFormItem>
                  <AppText tone='muted'>{t('availability.to')}</AppText>
                  <AppFormItem name={[field.name, 'end']} className='m-0'>
                    <TimePicker format='HH:mm' minuteStep={15} needConfirm={false} />
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
                  onClick={() => add({ ...EMPTY_RANGE })}
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

export const ProviderAvailabilityClient = () => {
  const t = useTranslations('Settings')
  const [form] = Form.useForm<FormValues>()
  const [saved, setSaved] = useState<FormValues | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getProviderProfileAPI()
      .then((data) => {
        const values = scheduleToForm(data)
        setSaved(values)
        form.setFieldsValue(values)
      })
      .catch((err) => setError(processError(err).message))
  }, [form])

  const persist = async (mode: 'draft' | 'publish') => {
    const values = form.getFieldsValue(true)
    setSaving(true)
    setError(null)
    try {
      const weekSchedule = formToWeekSchedule(values.days)
      await putProviderProfileAPI({
        mode: 'draft',
        weekSchedule,
        available: values.available,
      })
      const data = mode === 'publish' ? await putProviderProfileAPI({ mode: 'publish' }) : await getProviderProfileAPI()
      const next = scheduleToForm(data)
      setSaved(next)
      form.setFieldsValue(next)
      setDirty(false)
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.availability')} subtitle={t('availability.subtitle')} />
      {error && <Alert type='error' showIcon message={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          <ClockIcon className='text-brand h-5 w-5' />
          {t('availability.recurring')}
        </AppTitle>
        <AppParagraph size='body-sm'>{t('availability.recurringBody')}</AppParagraph>

        {!saved ? (
          <div className='bg-brand-50 min-h-40 animate-pulse rounded-brand' />
        ) : (
          <Form
            form={form}
            onValuesChange={(changed) => {
              setDirty(true)
              const days = changed.days as Partial<Record<WeekDay, DayForm>> | undefined
              if (!days) return
              WEEK_DAYS_LIST.forEach((day) => {
                if (days[day]?.open !== true) return
                const ranges = form.getFieldValue(['days', day, 'ranges']) as RangeForm[] | undefined
                if (!ranges?.length) {
                  form.setFieldValue(['days', day, 'ranges'], [{ ...EMPTY_RANGE }])
                }
              })
            }}
            className='flex flex-col gap-4'
          >
            <div className='bg-surface-sunken border-brand-border flex items-center justify-between rounded-brand border p-4'>
              <div>
                <AppText className='font-bold'>{t('availability.pauseTitle')}</AppText>
                <AppParagraph size='body-sm'>{t('availability.pauseBody')}</AppParagraph>
              </div>
              <AppFormItem name='available' valuePropName='checked' className='m-0'>
                <Switch />
              </AppFormItem>
            </div>

            {WEEK_DAYS_LIST.map((day) => (
              <AvailabilityDayRow key={day} day={day} />
            ))}
          </Form>
        )}
      </Surface>

      <SettingsActionBar
        dirty={dirty}
        saving={saving}
        onDiscard={() => {
          if (!saved) return
          form.setFieldsValue(saved)
          setDirty(false)
        }}
        onSaveDraft={() => void persist('draft')}
        onPublish={() => void persist('publish')}
        saveDraftLabel={t('actions.saveDraft')}
        publishLabel={t('actions.publish')}
        discardLabel={t('actions.discard')}
      />
    </div>
  )
}

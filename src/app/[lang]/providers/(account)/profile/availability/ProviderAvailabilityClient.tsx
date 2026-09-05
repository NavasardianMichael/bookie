'use client'

import { useEffect, useState } from 'react'
import { Alert, Checkbox, Form, Switch, TimePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { DaySchedule, ProviderProfile, WeekSchedule } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { processError } from '@helpers/error'
import { SettingsActionBar } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ClockIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

dayjs.extend(customParseFormat)

type DayForm = {
  open: boolean
  start?: Dayjs | null
  end?: Dayjs | null
}

type FormValues = {
  available: boolean
  days: Record<WeekDay, DayForm>
}

const scheduleToForm = (profile: ProviderProfile): FormValues => {
  const source = (profile.draft?.weekSchedule as WeekSchedule | undefined) ?? profile.details.weekSchedule
  const available = profile.draft?.available ?? profile.basic.available
  const days = WEEK_DAYS_LIST.reduce(
    (acc, day) => {
      const part: DaySchedule | undefined = source?.[day]
      const start = part?.availability?.start
      const end = part?.availability?.end
      const open = Boolean(start && end)
      acc[day] = {
        open,
        start: open ? dayjs(start, SCHEDULE_VALUE_FORMAT) : null,
        end: open ? dayjs(end, SCHEDULE_VALUE_FORMAT) : null,
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
    if (!row?.open || !row.start || !row.end) {
      acc[day] = { availability: { start: '', end: '' }, breaks: [] }
    } else {
      acc[day] = {
        availability: {
          start: row.start.format(SCHEDULE_VALUE_FORMAT),
          end: row.end.format(SCHEDULE_VALUE_FORMAT),
        },
        breaks: [],
      }
    }
    return acc
  }, {} as WeekSchedule)

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
      const data =
        mode === 'publish' ? await putProviderProfileAPI({ mode: 'publish' }) : await getProviderProfileAPI()
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
          <Form form={form} onValuesChange={() => setDirty(true)} className='flex flex-col gap-4'>
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
              <Form.Item key={day} shouldUpdate className='m-0'>
                {() => {
                  const open = form.getFieldValue(['days', day, 'open']) as boolean
                  return (
                    <div
                      className={`border-brand-border flex flex-col gap-3 rounded-brand border p-4 sm:flex-row sm:items-center sm:justify-between ${
                        open ? 'bg-surface-sunken' : 'border-dashed'
                      }`}
                    >
                      <div className='flex min-w-30 items-center gap-3'>
                        <AppFormItem name={['days', day, 'open']} valuePropName='checked' className='m-0'>
                          <Checkbox>
                            <span className={`font-bold text-body-sm ${open ? '' : 'text-brand-muted'}`}>
                              {t(`availability.days.${day}`)}
                            </span>
                          </Checkbox>
                        </AppFormItem>
                      </div>
                      {open ? (
                        <div className='flex flex-wrap items-center gap-2'>
                          <AppFormItem name={['days', day, 'start']} className='m-0'>
                            <TimePicker format='HH:mm' minuteStep={15} needConfirm={false} />
                          </AppFormItem>
                          <AppText tone='muted'>{t('availability.to')}</AppText>
                          <AppFormItem name={['days', day, 'end']} className='m-0'>
                            <TimePicker format='HH:mm' minuteStep={15} needConfirm={false} />
                          </AppFormItem>
                        </div>
                      ) : (
                        <AppText tone='muted' className='italic'>
                          {t('availability.unavailable')}
                        </AppText>
                      )}
                    </div>
                  )
                }}
              </Form.Item>
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

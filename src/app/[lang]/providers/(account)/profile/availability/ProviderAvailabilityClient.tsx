'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Checkbox, Form, Switch, TimePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { DaySchedule, ProviderProfile, WeekSchedule } from '@store/providers/profile/types'
import { TimeFormat, WeekDay } from '@interfaces/schedule'
import { ROUTES } from '@constants/routes'
import { MAX_DAY_RANGES, SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { rangesToDaySchedule, splitScheduleIntoParts } from '@helpers/schedule'
import { getTimeDisplayFormat, resolveTimeFormat } from '@helpers/timeFormat'
import { formatTimeZoneName } from '@helpers/timeZone'
import { SettingsActionBar, type SettingsPendingAction } from '@components/settings/SettingsActionBar'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
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

/**
 * The clock the hours are read on — edited on the Advanced settings tab, shown here only.
 * Draft wins, as it does for the hours: both go live together on Publish.
 */
type HoursClock = {
  timeZone?: string
  timeFormat: TimeFormat
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

const profileToClock = (profile: ProviderProfile, locale: string): HoursClock => ({
  timeZone: profile.draft?.timeZone ?? profile.details.timeZone,
  timeFormat: resolveTimeFormat(profile.draft?.timeFormat ?? profile.details.timeFormat, locale),
})

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

const AvailabilityDayRow = ({ day, timeFormat }: { day: WeekDay; timeFormat: TimeFormat }) => {
  const t = useTranslations('Settings')
  const form = Form.useFormInstance<FormValues>()
  const open = Form.useWatch(['days', day, 'open'], form)
  const pickerFormat = getTimeDisplayFormat(timeFormat)

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

/** Which zone the hours are in, and where to change it — they mean nothing without one. */
const HoursClockNote = ({ timeZone }: { timeZone?: string }) => {
  const t = useTranslations('Settings')
  const locale = useLocale()
  const link = (chunks: ReactNode) => <AppLink href={ROUTES.providerProfileAdvanced}>{chunks}</AppLink>

  return (
    <AppText size='body-sm' tone='muted'>
      {timeZone
        ? t.rich('availability.hoursInZone', { zone: formatTimeZoneName(timeZone, locale), link })
        : t.rich('availability.hoursNoZone', { link })}
    </AppText>
  )
}

export const ProviderAvailabilityClient = () => {
  const t = useTranslations('Settings')
  const tErrors = useTranslations('Errors')
  const locale = useLocale()
  const setAuthState = useAuthStore.use.setAuthState()
  const [form] = Form.useForm<FormValues>()
  const [clock, setClock] = useState<HoursClock | null>(null)
  const [saved, setSaved] = useState<FormValues | null>(null)
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<SettingsPendingAction | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((data) => {
        if (cancelled) return
        // Into `initialValues`, not `form.setFieldsValue`: the `<Form>` mounts only once
        // `saved` is set, so the instance is not connected to one yet.
        setSaved(scheduleToForm(data))
        setClock(profileToClock(data, locale))
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(request)
      })
    return () => {
      cancelled = true
    }
  }, [locale, request])

  const persist = async (mode: 'draft' | 'publish') => {
    const values = form.getFieldsValue(true)
    setPendingAction(mode)
    setError(null)
    try {
      const weekSchedule = formToWeekSchedule(values.days)
      await putProviderProfileAPI({
        mode: 'draft',
        weekSchedule,
        available: values.available,
      })
      const data = mode === 'publish' ? await putProviderProfileAPI({ mode: 'publish' }) : await getProviderProfileAPI()
      // Publish applies the whole draft, a clock drafted on Advanced settings included, and
      // the workspace prints times on the *published* clock.
      if (mode === 'publish') setAuthState({ timeFormat: data.details.timeFormat ?? null })
      const next = scheduleToForm(data)
      setSaved(next)
      setClock(profileToClock(data, locale))
      form.setFieldsValue(next)
      setDirty(false)
    } catch (err) {
      setError(err)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.availability')} subtitle={t('availability.subtitle')} />
      {error !== null && <ErrorAlert error={error} />}

      <Surface className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <ClockIcon className='text-brand h-5 w-5' />
            {t('availability.recurring')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('availability.recurringBody')}</AppParagraph>
        </div>

        {loadError !== null ? (
          <ErrorAlert
            error={loadError}
            title={tErrors('pages.settings')}
            onRetry={() => setRevision((current) => current + 1)}
            retrying={loading}
          />
        ) : !saved || !clock ? (
          <div className='bg-brand-50 min-h-40 animate-pulse rounded-brand' />
        ) : (
          <Form
            form={form}
            initialValues={saved}
            disabled={pendingAction !== null}
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

            <HoursClockNote timeZone={clock.timeZone} />

            {WEEK_DAYS_LIST.map((day) => (
              <AvailabilityDayRow key={day} day={day} timeFormat={clock.timeFormat} />
            ))}
          </Form>
        )}
      </Surface>

      {/* No Save over settings that never loaded: it would write the empty defaults. */}
      {loadError === null && (
        <SettingsActionBar
          dirty={dirty}
          pendingAction={pendingAction}
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
      )}
    </div>
  )
}

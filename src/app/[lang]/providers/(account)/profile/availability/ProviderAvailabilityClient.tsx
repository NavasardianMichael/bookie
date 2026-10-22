'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Form, Switch } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { ProviderProfile, WeekSchedule } from '@store/providers/profile/types'
import { ScheduleDaysForm, ScheduleRangeForm, TimeFormat } from '@interfaces/schedule'
import { ROUTES } from '@constants/routes'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { dayFormsToWeekSchedule, defaultScheduleRange, weekScheduleToDayForms } from '@helpers/schedule'
import { resolveTimeFormat } from '@helpers/timeFormat'
import { formatTimeZoneName } from '@helpers/timeZone'
import { AvailabilityDayRow } from '@components/settings/AvailabilityDayRow'
import { SettingsActionBar, type SettingsPendingAction } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { ClockIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type FormValues = {
  available: boolean
  days: ScheduleDaysForm
}

/**
 * The clock the hours are read on — edited on the Advanced settings tab, shown here only.
 * Draft wins, as it does for the hours: both go live together on Publish.
 */
type HoursClock = {
  timeZone?: string
  timeFormat: TimeFormat
}

const scheduleToForm = (profile: ProviderProfile): FormValues => ({
  available: profile.draft?.available ?? profile.basic.available,
  days: weekScheduleToDayForms(
    (profile.draft?.weekSchedule as WeekSchedule | undefined) ?? profile.details.weekSchedule
  ),
})

const profileToClock = (profile: ProviderProfile, locale: string): HoursClock => ({
  timeZone: profile.draft?.timeZone ?? profile.details.timeZone,
  timeFormat: resolveTimeFormat(profile.draft?.timeFormat ?? profile.details.timeFormat, locale),
})

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
      const weekSchedule = dayFormsToWeekSchedule(values.days)
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
              const days = changed.days as Partial<ScheduleDaysForm> | undefined
              if (!days) return
              WEEK_DAYS_LIST.forEach((day) => {
                if (days[day]?.open !== true) return
                const ranges = form.getFieldValue(['days', day, 'ranges']) as ScheduleRangeForm[] | undefined
                if (!ranges?.length) {
                  form.setFieldValue(['days', day, 'ranges'], [defaultScheduleRange()])
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
              <AvailabilityDayRow key={day} day={day} name={['days']} timeFormat={clock.timeFormat} />
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

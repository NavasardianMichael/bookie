'use client'

import { useEffect, useMemo, useState } from 'react'
import { ControlOutlined } from '@ant-design/icons'
import { Alert, Form, Segmented, Switch } from 'antd'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { ProviderProfile } from '@store/providers/profile/types'
import { useViewerTimeZone } from '@hooks/useViewerTimeZone'
import { TimeFormat } from '@interfaces/schedule'
import { SCHEDULE_VALUE_FORMAT, TIME_FORMATS, TIME_FORMATS_LIST } from '@constants/schedule'
import { getTimeDisplayFormat, resolveTimeFormat } from '@helpers/timeFormat'
import { formatTimeZoneName, getRuntimeTimeZone, isSameWallClock } from '@helpers/timeZone'
import { ProviderProfileTimeZone } from '@components/settings/ProviderProfileTimeZone'
import { SettingsActionBar, type SettingsPendingAction } from '@components/settings/SettingsActionBar'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

dayjs.extend(customParseFormat)

type FormValues = {
  /** The zone the weekly hours are written in. Undefined only until a suggestion fills it on load. */
  timeZone?: string
  /**
   * The clock every time for this provider is printed on. Always set: a provider who never
   * chose sees their locale's convention selected, and saving keeps what they saw.
   */
  timeFormat: TimeFormat
  /**
   * Whether the public booking page offers a time-zone list and a 12/24-hour switch.
   * One flag for both. On until the provider turns it off.
   */
  showClockChoices: boolean
}

/** Draft wins, as on every drafted tab: this form edits what Publish will apply. */
const profileToForm = (profile: ProviderProfile, locale: string): FormValues => ({
  timeZone: profile.draft?.timeZone ?? profile.details.timeZone,
  timeFormat: resolveTimeFormat(profile.draft?.timeFormat ?? profile.details.timeFormat, locale),
  showClockChoices: profile.draft?.showClockChoices ?? profile.details.showClockChoices ?? true,
})

/** What the device next to the form says the provider's zone is, when it disagrees with the pick. */
const DeviceTimeZoneHint = () => {
  const t = useTranslations('Settings')
  const locale = useLocale()
  const form = Form.useFormInstance<FormValues>()
  const picked = Form.useWatch('timeZone', form)
  const device = useViewerTimeZone()

  if (!picked || !device || isSameWallClock(picked, device)) return null
  return (
    <AppText size='body-sm' tone='muted'>
      {t('availability.timeZoneDeviceDiffers', { zone: formatTimeZoneName(device, locale) })}
    </AppText>
  )
}

/** 21:30 on each clock, so the choice is shown rather than described. */
const SAMPLE_TIME = dayjs('21:30', SCHEDULE_VALUE_FORMAT)

/**
 * 12- or 24-hour. `value` and `onChange` are injected by `Form.Item` (the `forms` skill's
 * control contract), which is why this is a component rather than a bare `Segmented`.
 */
const TimeFormatToggle = ({ value, onChange }: { value?: TimeFormat; onChange?: (next: TimeFormat) => void }) => {
  const t = useTranslations('Settings')

  return (
    <Segmented<TimeFormat>
      value={value}
      onChange={onChange}
      options={TIME_FORMATS_LIST.map((format) => ({
        value: format,
        label: t(format === TIME_FORMATS.h24 ? 'availability.timeFormat24' : 'availability.timeFormat12', {
          time: SAMPLE_TIME.format(getTimeDisplayFormat(format)),
        }),
      }))}
    />
  )
}

/**
 * The clock the provider's times are on: the zone the weekly hours are written in, how
 * times print, and whether visitors may switch either on the booking page. Moved out of
 * Availability, which keeps the hours themselves and the Accepting bookings switch.
 *
 * Drafted like Availability — Save draft writes the overlay and Publish applies it — so
 * the zone and the hours it governs still go live together when both tabs are published.
 */
export const ProviderAdvancedSettingsClient = () => {
  const t = useTranslations('Settings')
  const tErrors = useTranslations('Errors')
  const locale = useLocale()
  const setAuthState = useAuthStore.use.setAuthState()
  const [form] = Form.useForm<FormValues>()
  /**
   * Neither the live row nor the draft has a zone — an account from before the column
   * existed. The device's zone is filled in as a suggestion and the form starts dirty, so
   * Publish is one click; until then the public page reads the hours in each visitor's zone.
   */
  const [timeZoneSuggested, setTimeZoneSuggested] = useState(false)
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
        const values = profileToForm(data, locale)
        const suggested = values.timeZone ? undefined : getRuntimeTimeZone()
        if (suggested) values.timeZone = suggested
        // Into `initialValues`, not `form.setFieldsValue`: the `<Form>` mounts only once
        // `saved` is set, so the instance is not connected to one yet.
        setSaved(values)
        setTimeZoneSuggested(Boolean(suggested))
        setDirty(Boolean(suggested))
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
      await putProviderProfileAPI({
        mode: 'draft',
        timeZone: values.timeZone,
        timeFormat: values.timeFormat,
        showClockChoices: values.showClockChoices,
      })
      const data = mode === 'publish' ? await putProviderProfileAPI({ mode: 'publish' }) : await getProviderProfileAPI()
      // The workspace prints times on the *published* clock, so only Publish moves it.
      if (mode === 'publish') setAuthState({ timeFormat: data.details.timeFormat ?? null })
      const next = profileToForm(data, locale)
      setSaved(next)
      form.setFieldsValue(next)
      setTimeZoneSuggested(false)
      setDirty(false)
    } catch (err) {
      setError(err)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.advanced')} subtitle={t('advanced.subtitle')} />
      {error !== null && <ErrorAlert error={error} />}

      <Surface className='flex flex-col gap-6'>
        <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
          {/* antd, not `ui/icons.tsx`: a new glyph on a client island (src/components/CLAUDE.md). */}
          <ControlOutlined className='text-brand text-xl' />
          {t('advanced.clockTitle')}
        </AppTitle>

        {loadError !== null ? (
          <ErrorAlert
            error={loadError}
            title={tErrors('pages.settings')}
            onRetry={() => setRevision((current) => current + 1)}
            retrying={loading}
          />
        ) : !saved ? (
          <div className='bg-brand-50 min-h-40 animate-pulse rounded-brand' />
        ) : (
          <Form
            form={form}
            initialValues={saved}
            disabled={pendingAction !== null}
            onValuesChange={() => setDirty(true)}
            className='flex flex-col gap-4'
          >
            <div className='flex flex-col gap-2'>
              {timeZoneSuggested && <Alert type='info' showIcon title={t('availability.timeZoneSuggested')} />}
              <AppFormItem
                name='timeZone'
                label={t('availability.timeZone')}
                extra={t('availability.timeZoneHint')}
                className='m-0'
              >
                <ProviderProfileTimeZone />
              </AppFormItem>
              <DeviceTimeZoneHint />
            </div>

            <AppFormItem
              name='timeFormat'
              label={t('availability.timeFormat')}
              extra={t('availability.timeFormatHint')}
              className='m-0'
            >
              <TimeFormatToggle />
            </AppFormItem>

            <div className='bg-surface-sunken border-brand-border flex items-center justify-between gap-4 rounded-brand border p-4'>
              <div>
                <AppText className='font-bold'>{t('availability.showClockChoicesTitle')}</AppText>
                <AppParagraph size='body-sm'>{t('availability.showClockChoicesBody')}</AppParagraph>
              </div>
              <AppFormItem name='showClockChoices' valuePropName='checked' className='m-0'>
                <Switch />
              </AppFormItem>
            </div>
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

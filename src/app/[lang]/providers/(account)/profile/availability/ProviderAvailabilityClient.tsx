'use client'

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Form, Switch } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { getProviderProfileAPI, putProviderProfileAPI, putProviderServiceAPI } from '@api/providers/main'
import { useAuthStore } from '@store/auth/store'
import { ProviderProfile, ProviderScheduleRule, ProviderService, SpecialDate, WeekSchedule } from '@store/providers/profile/types'
import { useErrorToast } from '@hooks/useErrorToast'
import { useScheduleImpact } from '@hooks/useScheduleImpact'
import { ScheduleDaysForm, ScheduleRangeForm, TimeFormat } from '@interfaces/schedule'
import { ROUTES } from '@constants/routes'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { dayFormsToWeekSchedule, defaultScheduleRange, weekScheduleToDayForms } from '@helpers/schedule'
import { hasImpact, ImpactFit, ScheduleImpact } from '@helpers/scheduleConflicts'
import { resolveTimeFormat } from '@helpers/timeFormat'
import { formatTimeZoneName } from '@helpers/timeZone'
import {
  formToScheduleRule,
  ProviderScheduleRuleFields,
  scheduleRuleFieldsToValidate,
  type ScheduleRuleForm,
  scheduleRuleToForm,
} from '@components/settings/ProviderScheduleRuleFields'
import { ScheduleImpactModal } from '@components/settings/ScheduleImpactModal'
import { SettingsActionBar, type SettingsPendingAction } from '@components/settings/SettingsActionBar'
import { SpecialDatesEditor } from '@components/settings/SpecialDatesEditor'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { ClockIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

type FormValues = { available: boolean } & ScheduleRuleForm

/**
 * The clock the hours are read on — edited on the Advanced settings tab, shown here only.
 * Draft wins, as it does for the hours: both go live together on Publish.
 */
type HoursClock = {
  timeZone?: string
  timeFormat: TimeFormat
}

/** What is live now — what a publish is compared against before it replaces it. */
type Published = {
  providerId: string
  weekSchedule: WeekSchedule
  specialDates: SpecialDate[]
  rule?: ProviderScheduleRule
  services: ProviderService[]
}

const scheduleToForm = (profile: ProviderProfile): FormValues => ({
  available: profile.draft?.available ?? profile.basic.available,
  days: weekScheduleToDayForms(
    (profile.draft?.weekSchedule as WeekSchedule | undefined) ?? profile.details.weekSchedule
  ),
  ...scheduleRuleToForm((profile.draft?.scheduleRule as ProviderScheduleRule | undefined) ?? profile.details.scheduleRule),
})

const profileToSpecialDates = (profile: ProviderProfile): SpecialDate[] =>
  (profile.draft?.specialDates as SpecialDate[] | undefined) ?? profile.details.specialDates ?? []

const profileToPublished = (profile: ProviderProfile): Published => ({
  providerId: profile.id,
  weekSchedule: profile.details.weekSchedule,
  specialDates: profile.details.specialDates ?? [],
  rule: profile.details.scheduleRule,
  services: profile.services.allIds.map((id) => profile.services.byId[id]).filter(Boolean),
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
  const checkImpact = useScheduleImpact()
  const toast = useErrorToast()
  const [form] = Form.useForm<FormValues>()
  const [clock, setClock] = useState<HoursClock | null>(null)
  const [saved, setSaved] = useState<FormValues | null>(null)
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([])
  const [savedSpecialDates, setSavedSpecialDates] = useState<SpecialDate[]>([])
  const [published, setPublished] = useState<Published | null>(null)
  const [impact, setImpact] = useState<ScheduleImpact | null>(null)
  const [narrowServices, setNarrowServices] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<SettingsPendingAction | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  const pattern = Form.useWatch('pattern', form) ?? saved?.pattern ?? 'recurring'

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  const apply = useCallback(
    (data: ProviderProfile): void => {
      setSaved(scheduleToForm(data))
      setSpecialDates(profileToSpecialDates(data))
      setSavedSpecialDates(profileToSpecialDates(data))
      setPublished(profileToPublished(data))
      setClock(profileToClock(data, locale))
    },
    [locale]
  )

  useEffect(() => {
    let cancelled = false
    void getProviderProfileAPI()
      .then((data) => {
        if (cancelled) return
        // Into `initialValues`, not `form.setFieldsValue`: the `<Form>` mounts only once
        // `saved` is set, so the instance is not connected to one yet.
        apply(data)
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
  }, [apply, request])

  /** The rule as the form holds it, after checking the shown pattern's fields; `null` when they fail. */
  const readRule = async (): Promise<ProviderScheduleRule | null> => {
    const values = form.getFieldsValue(true) as FormValues
    try {
      await form.validateFields(scheduleRuleFieldsToValidate(values))
    } catch {
      return null
    }
    return formToScheduleRule(values)
  }

  /** Saves the draft, or publishes it; `true` once it went through. */
  const persist = async (mode: 'draft' | 'publish'): Promise<boolean> => {
    const values = form.getFieldsValue(true) as FormValues
    const scheduleRule = await readRule()
    if (!scheduleRule) return false
    setPendingAction(mode)
    setError(null)
    try {
      await putProviderProfileAPI({
        mode: 'draft',
        weekSchedule: dayFormsToWeekSchedule(values.days),
        specialDates,
        scheduleRule,
        available: values.available,
      })
      const data = mode === 'publish' ? await putProviderProfileAPI({ mode: 'publish' }) : await getProviderProfileAPI()
      // Publish applies the whole draft, a clock drafted on Advanced settings included, and
      // the workspace prints times on the *published* clock.
      if (mode === 'publish') setAuthState({ timeFormat: data.details.timeFormat ?? null })
      apply(data)
      form.setFieldsValue(scheduleToForm(data))
      setDirty(false)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      setPendingAction(null)
    }
  }

  /**
   * Fits the services the new hours narrowed, once the hours are live. Each is saved on its own;
   * one that fails is named in a toast and the rest still go through — the hours are published
   * either way, so this never reopens the dialog.
   */
  const fitServices = async (fits: ImpactFit[], providerId: string): Promise<void> => {
    const results = await Promise.allSettled(
      fits.map((fit) => putProviderServiceAPI({ providerId, serviceId: fit.id, service: { availability: fit.availability } }))
    )
    const saved = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    setPublished((current) =>
      current && { ...current, services: current.services.map((service) => saved.find((s) => s.id === service.id) ?? service) }
    )
    const failed = results.flatMap((result, index) => (result.status === 'rejected' ? [{ fit: fits[index]!, reason: result.reason as unknown }] : []))
    if (failed.length) {
      toast(failed[0]!.reason, {
        title: t('availability.impact.narrowFailed', { services: failed.map(({ fit }) => fit.name).join(', ') }),
      })
    }
  }

  /**
   * Publish, after saying what it does to the services and bookings that depend on the live
   * hours. Nothing is asked when nothing is affected; a booking read that fails is shown and
   * publishes nothing, rather than publishing as if no booking were in the way.
   */
  const publish = async (): Promise<void> => {
    if (!published) return
    const rule = await readRule()
    if (!rule) return
    setPendingAction('publish')
    setError(null)
    try {
      const found = await checkImpact({
        before: { weekSchedule: published.weekSchedule, specialDates: published.specialDates, rule: published.rule },
        after: { weekSchedule: dayFormsToWeekSchedule(form.getFieldsValue(true).days), specialDates, rule },
        services: published.services,
        timeZone: clock?.timeZone,
      })
      if (hasImpact(found)) {
        setPendingAction(null)
        setNarrowServices(false)
        setImpact(found)
        return
      }
    } catch (err) {
      setError(err)
      setPendingAction(null)
      return
    }
    await persist('publish')
  }

  /** What every dates section shares: the one list of special dates, and the clock it is read on. */
  const datesProps = {
    value: specialDates,
    onChange: (next: SpecialDate[]) => {
      setSpecialDates(next)
      setDirty(true)
    },
    timeFormat: clock?.timeFormat ?? 'h24',
    timeZone: clock?.timeZone,
    disabled: pendingAction !== null,
  } as const

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title={t('nav.availability')} subtitle={t('availability.subtitle')} />
      {error !== null && <ErrorAlert error={error} />}

      <Surface className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <AppTitle level='h2' size='h3' className='flex items-center gap-2'>
            <ClockIcon className='text-brand h-5 w-5' />
            {t('availability.schedule.title')}
          </AppTitle>
          <AppParagraph size='body-sm'>{t('availability.schedule.body')}</AppParagraph>
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

            <ProviderScheduleRuleFields timeFormat={clock.timeFormat} />

            {pattern === 'dates' && (
              <SpecialDatesEditor section='openDates' nested {...datesProps} />
            )}
          </Form>
        )}
      </Surface>

      {/* Under a recurring rule, single dates are added or excluded on top of it. */}
      {loadError === null && saved && clock && pattern === 'recurring' && (
        <>
          <Surface>
            <SpecialDatesEditor section='added' {...datesProps} />
          </Surface>
          <Surface>
            <SpecialDatesEditor section='excluded' {...datesProps} />
          </Surface>
        </>
      )}

      {/* No Save over settings that never loaded: it would write the empty defaults. */}
      {loadError === null && (
        <SettingsActionBar
          dirty={dirty}
          pendingAction={pendingAction}
          onDiscard={() => {
            if (!saved) return
            form.setFieldsValue(saved)
            setSpecialDates(savedSpecialDates)
            setDirty(false)
          }}
          onSaveDraft={() => void persist('draft')}
          onPublish={() => void publish()}
          saveDraftLabel={t('actions.saveDraft')}
          publishLabel={t('actions.publish')}
          discardLabel={t('actions.discard')}
        />
      )}

      <ScheduleImpactModal
        impact={impact}
        timeZone={clock?.timeZone}
        timeFormat={clock?.timeFormat ?? 'h24'}
        narrow={{ checked: narrowServices, onChange: setNarrowServices }}
        onCancel={() => setImpact(null)}
        onConfirm={async () => {
          const fits = narrowServices ? (impact?.fits ?? []) : []
          const providerId = published?.providerId
          setImpact(null)
          if ((await persist('publish')) && fits.length && providerId) await fitServices(fits, providerId)
        }}
      />
    </div>
  )
}

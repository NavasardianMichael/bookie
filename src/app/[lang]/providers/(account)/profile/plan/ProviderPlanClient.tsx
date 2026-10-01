'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Progress, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { getPlansAPI, getProviderPlanAPI } from '@api/plans/main'
import { Plan, PlanCatalogueEntry, ProviderPlanWithUsage } from '@interfaces/plans'
import { PLAN_ORDER, PLAN_TAG_COLORS } from '@constants/plans'
import { hasRoomFor, toPlanLastDay, usagePercent } from '@helpers/plans'
import { PlanComparisonTable } from '@components/plans/PlanComparisonTable'
import { PlanUpgradeSheet } from '@components/plans/PlanUpgradeSheet'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Surface } from '@components/ui/layout/Surface'
import { StatTile } from '@components/ui/StatTile'

const isAbove = (plan: Plan, than: Plan): boolean => PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(than)

/**
 * The provider's plan: what they are on, what they have used this month, and every plan
 * side by side with a way to ask for a bigger one.
 *
 * Two reads in one effect — the provider's plan with usage (`GET /provider-profile/plan`)
 * and the catalogue (`GET /plans`) — because the page is meaningless with either missing,
 * so one failure replaces the whole panel with a Retry rather than half a page.
 *
 * There is no checkout yet. "Request upgrade" sends the contact form with the plan attached,
 * and the plan is assigned from `/admin/providers` (docs/BILLING.md).
 */
export const ProviderPlanClient = () => {
  const t = useTranslations('Settings.plan')
  const tPlans = useTranslations('Plans')
  const tErrors = useTranslations('Errors')
  const format = useFormatter()

  const [current, setCurrent] = useState<ProviderPlanWithUsage | null>(null)
  const [catalogue, setCatalogue] = useState<PlanCatalogueEntry[]>([])
  const [error, setError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const [requested, setRequested] = useState<Plan | null>(null)

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false

    void Promise.all([getProviderPlanAPI(), getPlansAPI()])
      .then(([plan, plans]) => {
        if (cancelled) return
        setCurrent(plan)
        setCatalogue(plans)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(request)
      })

    return () => {
      cancelled = true
    }
  }, [request])

  // UTC throughout: the expiry and the booking month are both counted in UTC on the server.
  const formatDay = (date: Date): string => format.dateTime(date, { dateStyle: 'long', timeZone: 'UTC' })

  const header = <PageHeader title={t('title')} subtitle={t('subtitle')} />

  if (error !== null) {
    return (
      <div className='flex flex-col gap-6'>
        {header}
        <ErrorAlert
          error={error}
          title={tErrors('pages.settings')}
          onRetry={() => setRevision((value) => value + 1)}
          retrying={loading}
        />
      </div>
    )
  }

  if (loading || !current) {
    return (
      <div className='flex flex-col gap-6'>
        {header}
        <div className='bg-brand-100 h-24 animate-pulse rounded-brand' />
        <div className='bg-brand-100 h-72 animate-pulse rounded-brand' />
      </div>
    )
  }

  const { entitlements, usage, effectivePlan, planExpiresAt } = current
  const lapsed = current.plan !== effectivePlan
  const resetsOn = formatDay(new Date(usage.periodEnd))
  const bookingsFull = !hasRoomFor(usage.bookingsThisMonth, entitlements.maxBookingsPerMonth)
  const servicesFull = !hasRoomFor(usage.activeServices, entitlements.maxActiveServices)

  const usedOf = (used: number, limit: number | null): string =>
    limit === null ? format.number(used) : t('usedOfLimit', { used, limit })

  const meter = (used: number, limit: number | null, full: boolean) => {
    const percent = usagePercent(used, limit)
    return percent === null ? null : (
      <Progress percent={percent} showInfo={false} status={full ? 'exception' : 'normal'} aria-hidden />
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {header}

      <Surface className='flex flex-col gap-2'>
        <AppText size='overline' tone='muted' className='font-semibold'>
          {t('currentPlan')}
        </AppText>
        <div className='flex flex-wrap items-center gap-3'>
          <Tag color={PLAN_TAG_COLORS[effectivePlan]} className='m-0 text-body'>
            {tPlans(`names.${effectivePlan}`)}
          </Tag>
          {planExpiresAt && (
            <AppText size='body-sm' tone={lapsed ? 'danger' : 'muted'}>
              {lapsed
                ? t('lapsed', { plan: tPlans(`names.${current.plan}`), date: formatDay(toPlanLastDay(planExpiresAt)) })
                : t('activeUntil', { date: formatDay(toPlanLastDay(planExpiresAt)) })}
            </AppText>
          )}
        </div>
      </Surface>

      {/* The one state a visitor notices: the page has stopped taking bookings. */}
      {bookingsFull && <Alert type='warning' showIcon title={t('bookingsFullTitle')} description={t('bookingsFullBody', { date: resetsOn })} />}

      <ResponsiveGrid min='sm'>
        <StatTile
          label={t('activeServices')}
          value={usedOf(usage.activeServices, entitlements.maxActiveServices)}
          hint={entitlements.maxActiveServices === null ? tPlans('unlimited') : servicesFull ? t('servicesFull') : undefined}
          action={meter(usage.activeServices, entitlements.maxActiveServices, servicesFull)}
        />
        <StatTile
          label={t('bookingsThisMonth')}
          value={usedOf(usage.bookingsThisMonth, entitlements.maxBookingsPerMonth)}
          hint={entitlements.maxBookingsPerMonth === null ? tPlans('unlimited') : t('resetsOn', { date: resetsOn })}
          action={meter(usage.bookingsThisMonth, entitlements.maxBookingsPerMonth, bookingsFull)}
        />
      </ResponsiveGrid>

      <Surface className='flex flex-col gap-4'>
        <AppText size='overline' tone='muted' className='font-semibold'>
          {t('comparePlans')}
        </AppText>
        <PlanComparisonTable
          plans={catalogue}
          currentPlan={effectivePlan}
          caption={t('comparePlans')}
          renderAction={(plan) =>
            isAbove(plan, effectivePlan) ? (
              <AppButton type='primary' onClick={() => setRequested(plan)}>
                {t('requestUpgrade')}
              </AppButton>
            ) : null
          }
        />
        <AppParagraph size='body-sm' className='m-0'>
          {t('manualNote')}
        </AppParagraph>
      </Surface>

      <PlanUpgradeSheet plan={requested} onClose={() => setRequested(null)} />
    </div>
  )
}

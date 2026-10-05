'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Alert, Progress, Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { postBillingPortalAPI, postChangePlanAPI } from '@api/billing/main'
import { getPlansAPI, getProviderPlanAPI } from '@api/plans/main'
import { useAwaitPlan } from '@hooks/useAwaitPlan'
import { useErrorToast } from '@hooks/useErrorToast'
import { useStartCheckout } from '@hooks/useStartCheckout'
import { PaidPlan, Plan, PlanCatalogueEntry, ProviderPlanWithUsage } from '@interfaces/plans'
import { BILLING_STATUSES } from '@constants/billing'
import { PLAN_ORDER, PLAN_TAG_COLORS, PLANS } from '@constants/plans'
import { hasRoomFor, toPlanLastDay, usagePercent } from '@helpers/plans'
import { PlanComparisonTable } from '@components/plans/PlanComparisonTable'
import { PlanUpgradeSheet } from '@components/plans/PlanUpgradeSheet'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Surface } from '@components/ui/layout/Surface'
import { StatTile } from '@components/ui/StatTile'

const isAbove = (plan: Plan, than: Plan): boolean => PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(than)

const isPaid = (plan: Plan): plan is PaidPlan => plan !== PLANS.free

/**
 * The provider's plan: what they are on, what they have used this month, and every plan
 * side by side with a way to move.
 *
 * Two reads in one effect — the provider's plan with usage and billing
 * (`GET /provider-profile/plan`) and the catalogue (`GET /plans`) — because the page is
 * meaningless with either missing, so one failure replaces the whole panel with a Retry.
 *
 * How a plan is bought depends on what this deployment sells (docs/BILLING.md):
 *
 * - **Purchasable, not subscribed** — Upgrade starts a Paddle checkout (`useStartCheckout`).
 * - **Subscribed** — Switch changes the subscription's plan, prorated, after a confirm;
 *   the page then waits for the webhook (`useAwaitPlan`) and shows the new plan. Leaving a
 *   paid plan for Free, the card and the invoices are in Paddle's billing portal.
 * - **Not purchasable** — Request upgrade sends the contact form, assigned by hand.
 */
export const ProviderPlanClient = () => {
  const t = useTranslations('Settings.plan')
  const tPlans = useTranslations('Plans')
  const tErrors = useTranslations('Errors')
  const format = useFormatter()
  const showError = useErrorToast()
  const { startCheckout, pendingPlan } = useStartCheckout()

  const [loaded, setLoaded] = useState<ProviderPlanWithUsage | null>(null)
  const [catalogue, setCatalogue] = useState<PlanCatalogueEntry[]>([])
  const [error, setError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const [requested, setRequested] = useState<Plan | null>(null)
  const [switchTo, setSwitchTo] = useState<PaidPlan | null>(null)
  const [switching, setSwitching] = useState<{ plan: PaidPlan; attempt: number } | null>(null)
  const [portalPending, setPortalPending] = useState(false)

  // `loading` is derived from the request's identity, never set at the top of the effect.
  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false

    void Promise.all([getProviderPlanAPI(), getPlansAPI()])
      .then(([plan, plans]) => {
        if (cancelled) return
        setLoaded(plan)
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

  // After a switch, the plan read by the wait replaces the one loaded before it.
  const awaited = useAwaitPlan(switching?.plan ?? null, switching?.attempt)
  const current = awaited.status === 'done' ? awaited.current : loaded

  // UTC for the expiry and the booking month, which are both counted in UTC on the server.
  const formatDay = (date: Date): string => format.dateTime(date, { dateStyle: 'long', timeZone: 'UTC' })
  // Billing dates are Paddle's instants, shown in the reader's own zone.
  const formatInstant = (iso: string): string => format.dateTime(new Date(iso), { dateStyle: 'long' })

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

  const { entitlements, usage, effectivePlan, planExpiresAt, billing } = current
  const lapsed = current.plan !== effectivePlan
  const resetsOn = formatDay(new Date(usage.periodEnd))
  const bookingsFull = !hasRoomFor(usage.bookingsThisMonth, entitlements.maxBookingsPerMonth)
  const servicesFull = !hasRoomFor(usage.activeServices, entitlements.maxActiveServices)

  const subscribed = billing !== null && billing.status !== BILLING_STATUSES.canceled
  const pastDue = billing?.status === BILLING_STATUSES.pastDue
  const purchasable = new Map(catalogue.map(({ id, purchasable }) => [id, purchasable]))
  const sellsAny = catalogue.some(({ purchasable }) => purchasable)
  const waitingForSwitch = switching !== null && awaited.status === 'waiting'

  const openPortal = async (): Promise<void> => {
    setPortalPending(true)
    try {
      window.location.assign(await postBillingPortalAPI())
    } catch (err) {
      setPortalPending(false)
      showError(err, { title: t('portalFailed'), key: 'billing-portal' })
    }
  }

  const confirmSwitch = async (): Promise<void> => {
    if (!switchTo) return
    await postChangePlanAPI({ plan: switchTo })
    // Keep what the last switch landed on while the next one is awaited.
    if (awaited.status === 'done') setLoaded(awaited.current)
    setSwitching((previous) => ({ plan: switchTo, attempt: (previous?.attempt ?? 0) + 1 }))
    setSwitchTo(null)
  }

  const statusLine = (): ReactNode => {
    if (subscribed && billing.cancelsAt) {
      return (
        <AppText size='body-sm' tone='danger'>
          {t('cancelsOn', { date: formatInstant(billing.cancelsAt) })}
        </AppText>
      )
    }
    if (subscribed && !pastDue && billing.periodEndsAt) {
      return (
        <AppText size='body-sm' tone='muted'>
          {t('renewsOn', { date: formatInstant(billing.periodEndsAt) })}
        </AppText>
      )
    }
    if (!subscribed && planExpiresAt) {
      return (
        <AppText size='body-sm' tone={lapsed ? 'danger' : 'muted'}>
          {lapsed
            ? t('lapsed', { plan: tPlans(`names.${current.plan}`), date: formatDay(toPlanLastDay(planExpiresAt)) })
            : t('activeUntil', { date: formatDay(toPlanLastDay(planExpiresAt)) })}
        </AppText>
      )
    }
    return null
  }

  const action = (plan: Plan): ReactNode => {
    if (!isPaid(plan)) {
      // Leaving a subscription is a cancellation, which Paddle's portal owns.
      return subscribed && !billing.cancelsAt && billing.manageable ? (
        <AppButton loading={portalPending} onClick={() => void openPortal()}>
          {t('cancelInPortal')}
        </AppButton>
      ) : null
    }

    if (!purchasable.get(plan)) {
      return isAbove(plan, effectivePlan) ? (
        <AppButton type='primary' onClick={() => setRequested(plan)}>
          {t('requestUpgrade')}
        </AppButton>
      ) : null
    }

    if (subscribed) {
      if (plan === current.plan) return null
      return (
        <AppButton
          type={isAbove(plan, current.plan) ? 'primary' : 'default'}
          disabled={waitingForSwitch}
          onClick={() => setSwitchTo(plan)}
        >
          {isAbove(plan, current.plan) ? t('upgrade') : t('switch')}
        </AppButton>
      )
    }

    return isAbove(plan, effectivePlan) ? (
      <AppButton
        type='primary'
        loading={pendingPlan === plan}
        disabled={pendingPlan !== null && pendingPlan !== plan}
        onClick={() => void startCheckout(plan)}
      >
        {t('upgrade')}
      </AppButton>
    ) : null
  }

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

      <Surface className='flex flex-col gap-3'>
        <AppText size='overline' tone='muted' className='font-semibold'>
          {t('currentPlan')}
        </AppText>
        <div className='flex flex-wrap items-center gap-3'>
          <Tag color={PLAN_TAG_COLORS[effectivePlan]} className='m-0 text-body'>
            {tPlans(`names.${effectivePlan}`)}
          </Tag>
          {statusLine()}
        </div>
        {billing?.manageable && (
          <div>
            <AppButton loading={portalPending} onClick={() => void openPortal()}>
              {t('manageBilling')}
            </AppButton>
          </div>
        )}
      </Surface>

      {pastDue && (
        <Alert
          type='warning'
          showIcon
          title={t('paymentFailedTitle')}
          description={t('paymentFailedBody', { plan: tPlans(`names.${current.plan}`) })}
        />
      )}

      {switching && awaited.status !== 'done' && (
        <Alert
          type='info'
          showIcon
          title={
            awaited.status === 'waiting'
              ? t('switchingTitle', { plan: tPlans(`names.${switching.plan}`) })
              : t('switchPendingTitle')
          }
          description={awaited.status === 'waiting' ? undefined : t('switchPendingBody')}
        />
      )}

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
        <PlanComparisonTable plans={catalogue} currentPlan={effectivePlan} caption={t('comparePlans')} renderAction={action} />
        <AppParagraph size='body-sm' className='m-0'>
          {sellsAny ? t('billingNote') : t('manualNote')}
        </AppParagraph>
      </Surface>

      <PlanUpgradeSheet plan={requested} onClose={() => setRequested(null)} />

      <AppConfirmModal
        open={switchTo !== null}
        title={switchTo ? t('switchTitle', { plan: tPlans(`names.${switchTo}`) }) : ''}
        description={t('switchBody')}
        okText={t('switchConfirm')}
        onConfirm={confirmSwitch}
        onCancel={() => setSwitchTo(null)}
      />
    </div>
  )
}

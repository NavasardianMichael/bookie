'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppstoreOutlined, CrownOutlined } from '@ant-design/icons'
import { useFormatter, useTranslations } from 'next-intl'
import { getBillingPaymentsAPI } from '@api/billing/main'
import { ProviderPayment } from '@api/billing/types'
import { getProviderPlanAPI } from '@api/plans/main'
import { ProviderPlanWithUsage } from '@interfaces/plans'
import { ADDON_ORDER, ADDONS, PLANS } from '@constants/plans'
import { heldQuantity } from '@helpers/plans'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Surface } from '@components/ui/layout/Surface'
import { StatTile } from '@components/ui/StatTile'

/** Capacity packs show how many are on; a feature is simply on. */
const PACKS = new Set<string>([ADDONS.extraServices, ADDONS.extraBookings])

/**
 * What this provider pays Bookie: the plan and features they hold, in the same stat
 * cards as Manage services, then the charges that have already settled.
 *
 * The cards come from `GET /provider-profile/plan` (an admin grant counts). The list
 * comes from `GET /billing/payments` — Paddle's settled transactions, not the catalogue.
 */
export const ProviderPayoutsClient = () => {
  const t = useTranslations('Settings.payouts')
  const tPlan = useTranslations('Settings.plan')
  const tPlans = useTranslations('Plans')
  const tErrors = useTranslations('Errors')
  const format = useFormatter()

  const [plan, setPlan] = useState<ProviderPlanWithUsage | null>(null)
  const [payments, setPayments] = useState<ProviderPayment[] | null>(null)
  const [planError, setPlanError] = useState<unknown>(null)
  const [paymentsError, setPaymentsError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  const request = useMemo(() => ({ revision }), [revision])
  const [planFulfilled, setPlanFulfilled] = useState<object | null>(null)
  const [paymentsFulfilled, setPaymentsFulfilled] = useState<object | null>(null)
  const planLoading = planFulfilled !== request
  const paymentsLoading = paymentsFulfilled !== request

  useEffect(() => {
    let cancelled = false

    void getProviderPlanAPI()
      .then((next) => {
        if (cancelled) return
        setPlan(next)
        setPlanError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setPlanError(err)
      })
      .finally(() => {
        if (!cancelled) setPlanFulfilled(request)
      })

    void getBillingPaymentsAPI()
      .then((next) => {
        if (cancelled) return
        setPayments(next)
        setPaymentsError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setPaymentsError(err)
      })
      .finally(() => {
        if (!cancelled) setPaymentsFulfilled(request)
      })

    return () => {
      cancelled = true
    }
  }, [request])

  const header = <PageHeader title={t('title')} subtitle={t('subtitle')} />
  const retry = () => setRevision((value) => value + 1)

  if (planError !== null) {
    return (
      <div className='flex flex-col gap-6'>
        {header}
        <ErrorAlert error={planError} title={tErrors('pages.settings')} onRetry={retry} retrying={planLoading} />
      </div>
    )
  }

  const features = plan
    ? ADDON_ORDER.flatMap((addon) => {
        const quantity = heldQuantity(plan.addons, addon)
        return quantity > 0 ? [{ addon, quantity }] : []
      })
    : []

  const planHint = (): string | undefined => {
    if (!plan) return undefined
    if (plan.billing?.cancelsAt) {
      return tPlan('cancelsOn', { date: format.dateTime(new Date(plan.billing.cancelsAt), { dateStyle: 'medium' }) })
    }
    if (plan.billing?.periodEndsAt && plan.effectivePlan !== PLANS.free) {
      return tPlan('renewsOn', { date: format.dateTime(new Date(plan.billing.periodEndsAt), { dateStyle: 'medium' }) })
    }
    if (plan.effectivePlan === PLANS.free) return tPlans('freeForever')
    return undefined
  }

  const paymentLabel = (payment: ProviderPayment): string => {
    const parts = [
      ...(payment.plan ? [tPlans(`names.${payment.plan}`)] : []),
      ...payment.addons.map(({ addon, quantity }) =>
        quantity > 1 ? `${tPlans(`addons.${addon}.name`)} ×${quantity}` : tPlans(`addons.${addon}.name`)
      ),
    ]
    return parts.length ? format.list(parts, { type: 'conjunction' }) : t('unknownPayment')
  }

  return (
    <div className='flex flex-col gap-6'>
      {header}

      {planLoading || !plan ? (
        <ResponsiveGrid min='sm' gap='md'>
          <div className='bg-brand-50 min-h-24 animate-pulse rounded-brand' />
          <div className='bg-brand-50 min-h-24 animate-pulse rounded-brand' />
        </ResponsiveGrid>
      ) : (
        <ResponsiveGrid min='sm' gap='md'>
          <StatTile
            layout='row'
            icon={<CrownOutlined className='text-lg' />}
            label={t('activePlan')}
            value={tPlans(`names.${plan.effectivePlan}`)}
            hint={planHint()}
          />
          {features.map(({ addon, quantity }) => (
            <StatTile
              key={addon}
              layout='row'
              icon={<AppstoreOutlined className='text-lg' />}
              label={tPlans(`addons.${addon}.name`)}
              value={PACKS.has(addon) ? String(quantity) : t('activeFeature')}
            />
          ))}
        </ResponsiveGrid>
      )}

      <div className='flex flex-col gap-3'>
        <AppTitle level='h2' size='h3'>
          {t('history')}
        </AppTitle>

        {paymentsError !== null ? (
          <ErrorAlert error={paymentsError} title={tErrors('pages.settings')} onRetry={retry} retrying={paymentsLoading} />
        ) : paymentsLoading || !payments ? (
          <div className='bg-brand-50 h-40 animate-pulse rounded-brand' />
        ) : payments.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
        ) : (
          <Surface>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-start'>
                <caption className='sr-only'>{t('history')}</caption>
                <thead>
                  <tr>
                    {(['date', 'payment', 'amount', 'status'] as const).map((column) => (
                      <th key={column} scope='col' className='border-brand-border border-b px-3 py-3 text-start'>
                        <AppText size='overline' tone='muted'>
                          {t(column)}
                        </AppText>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className='border-brand-border border-b px-3 py-3'>
                        {format.dateTime(new Date(payment.paidAt), { dateStyle: 'medium' })}
                      </td>
                      <th scope='row' className='border-brand-border border-b px-3 py-3 text-start font-semibold'>
                        {paymentLabel(payment)}
                      </th>
                      <td className='border-brand-border border-b px-3 py-3'>
                        {format.number(payment.total, { style: 'currency', currency: payment.currency })}
                      </td>
                      <td className='border-brand-border border-b px-3 py-3'>{t(payment.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        )}
      </div>
    </div>
  )
}

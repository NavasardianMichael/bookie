'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getPlansAPI } from '@api/plans/main'
import { PlanCatalogueEntry } from '@interfaces/plans'
import { PlanPrice } from '@components/plans/PlanPrice'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

/**
 * Every plan's monthly cost, read from `GET /plans`. The sidebar entry in the place Plan
 * used to hold. Prices start as the catalogue's USD amounts and then follow the visitor's
 * currency, the same way `/pricing` does.
 */
export const ProviderPayoutsClient = () => {
  const t = useTranslations('Settings.payouts')
  const tPlans = useTranslations('Plans')
  const tErrors = useTranslations('Errors')

  const [plans, setPlans] = useState<PlanCatalogueEntry[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false

    void getPlansAPI()
      .then((next) => {
        if (cancelled) return
        setPlans(next)
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

  return (
    <div className='flex flex-col gap-6'>
      {header}
      {loading || !plans ? (
        <div className='bg-brand-100 h-64 animate-pulse rounded-brand' />
      ) : (
        <Surface>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-start'>
              <caption className='sr-only'>{t('title')}</caption>
              <thead>
                <tr>
                  <th scope='col' className='border-brand-border border-b px-3 py-3 text-start'>
                    <AppText size='overline' tone='muted'>
                      {t('plan')}
                    </AppText>
                  </th>
                  <th scope='col' className='border-brand-border border-b px-3 py-3 text-start'>
                    <AppText size='overline' tone='muted'>
                      {t('cost')}
                    </AppText>
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map(({ id, price }) => (
                  <tr key={id}>
                    <th scope='row' className='border-brand-border border-b px-3 py-3 text-start font-semibold'>
                      {tPlans(`names.${id}`)}
                    </th>
                    <td className='border-brand-border border-b px-3 py-3'>
                      <PlanPrice plan={id} price={price} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </div>
  )
}

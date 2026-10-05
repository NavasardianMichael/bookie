import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getPlansAPI } from '@api/plans/main'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { PlanComparisonTable } from '@components/plans/PlanComparisonTable'
import { PricingCurrencyNote } from '@components/plans/PricingCurrencyNote'
import { PricingFaq } from '@components/plans/PricingFaq'
import { PricingIncluded } from '@components/plans/PricingIncluded'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { PageHeader, PageShell } from '@components/ui/layout'
import { Surface } from '@components/ui/layout/Surface'
import { PricingPlanAction } from './PricingPlanAction'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Pricing')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.pricing]),
  }
}

/**
 * The plans and their prices, for providers deciding whether to join or upgrade.
 *
 * A Server Component over `GET /plans`, so the table — every limit and the USD price of
 * every plan — is in the HTML a crawler reads, and so are what every plan includes and the
 * billing FAQ. Only the per-column actions and the price cells hydrate: the actions to start
 * a Paddle checkout, the prices to swap in the visitor's local currency. Nothing here knows a
 * limit or a price (docs/BILLING.md).
 *
 * Clients never pay, and the page says so — the footer hides this link from consumer
 * sessions, but a client can still land here from a search.
 */
export default async function Pricing() {
  const [t, plans] = await Promise.all([getTranslations('Pricing'), getPlansAPI()])
  const purchasable = new Map(plans.map(({ id, purchasable }) => [id, purchasable]))
  const sellsAny = plans.some(({ purchasable }) => purchasable)

  return (
    <PageShell className='flex flex-col gap-10'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className='flex flex-col gap-3'>
        <Surface className='flex flex-col gap-4'>
          <PlanComparisonTable
            plans={plans}
            caption={t('title')}
            renderAction={(plan) => <PricingPlanAction plan={plan} purchasable={purchasable.get(plan) ?? false} />}
          />
        </Surface>
        <div className='flex flex-col gap-1'>
          <AppParagraph size='body-sm' className='m-0'>
            {t('billedMonthly')}
          </AppParagraph>
          <PricingCurrencyNote />
          {!sellsAny && (
            <AppParagraph size='body-sm' className='m-0'>
              {t('manualNote')}
            </AppParagraph>
          )}
        </div>
      </div>

      <PricingIncluded />
      <PricingFaq />

      <AppParagraph size='body-sm' className='m-0'>
        {t('clientsFree')}
      </AppParagraph>
    </PageShell>
  )
}

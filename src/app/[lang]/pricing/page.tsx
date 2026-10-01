import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getPlansAPI } from '@api/plans/main'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { PlanComparisonTable } from '@components/plans/PlanComparisonTable'
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
 * The plans, for providers deciding whether to join or upgrade.
 *
 * A Server Component over `GET /plans`, so the table — every limit of every plan — is in
 * the HTML a crawler reads; only the per-column actions hydrate. The limits are the API's,
 * never written here. No prices yet: until a payment provider is wired in, a paid plan is
 * requested through the contact form and assigned by hand (docs/BILLING.md).
 *
 * Clients never pay, and the page says so — the footer hides this link from consumer
 * sessions, but a client can still land here from a search.
 */
export default async function Pricing() {
  const [t, plans] = await Promise.all([getTranslations('Pricing'), getPlansAPI()])

  return (
    <PageShell className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Surface className='flex flex-col gap-4'>
        <PlanComparisonTable
          plans={plans}
          caption={t('title')}
          renderAction={(plan) => <PricingPlanAction plan={plan} />}
        />
      </Surface>

      <div className='flex flex-col gap-2'>
        <AppParagraph size='body-sm' className='m-0'>
          {t('clientsFree')}
        </AppParagraph>
        <AppParagraph size='body-sm' className='m-0'>
          {t('manualNote')}
        </AppParagraph>
      </div>
    </PageShell>
  )
}

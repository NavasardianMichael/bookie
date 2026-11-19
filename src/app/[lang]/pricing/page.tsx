import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getMeAPI } from '@api/auth/main'
import { getAddonsAPI, getPlansAPI, getProviderPlanAPI } from '@api/plans/main'
import { Plan } from '@interfaces/plans'
import { localizedAlternates } from '@i18n/metadata'
import { SESSION_COOKIE, USER_TYPES } from '@constants/auth'
import { BILLING_STATUSES } from '@constants/billing'
import { PLANS } from '@constants/plans'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { classifyError } from '@helpers/error'
import { reportError } from '@helpers/reportError'
import { AddonCatalogue } from '@components/plans/AddonCatalogue'
import { PlanComparisonTable } from '@components/plans/PlanComparisonTable'
import { PricingAiFeatures } from '@components/plans/PricingAiFeatures'
import { PricingCurrencyNote } from '@components/plans/PricingCurrencyNote'
import { PricingFaq } from '@components/plans/PricingFaq'
import { PricingIncluded } from '@components/plans/PricingIncluded'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { PageHeader, PageShell } from '@components/ui/layout'
import { Section } from '@components/ui/layout/Section'
import { Surface } from '@components/ui/layout/Surface'
import { PricingAddonAction } from './PricingAddonAction'
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
 * A Server Component over `GET /plans` and `GET /plans/addons`, so the table — every limit
 * and the USD price of every plan — what each AI feature does, and every add-on sold on its
 * own are in the HTML a crawler reads, and so are what every plan includes and the billing FAQ. Only the per-column actions and the price cells hydrate: the actions to start
 * a Paddle checkout, the prices to swap in the visitor's local currency. Nothing here knows a
 * limit or a price (docs/BILLING.md).
 *
 * A signed-in provider's effective plan is read with the session cookie and passed into the
 * table, so their column is marked and that plan cannot be chosen. A cheaper one links a
 * subscriber to the Plan tab's switch confirm, which owns switching (and a move down waits
 * for the paid period's end); without a subscription it stays disabled.
 * An add-on that plan already includes gets the same disabled button. A guest, a client,
 * or a failed plan read leaves the columns and the add-on buttons unmarked — the page still renders.
 *
 * Clients never pay, and the page says so — the footer hides this link from consumer
 * sessions, but a client can still land here from a search.
 */
type CurrentPlan = { plan?: Plan; subscribed: boolean }

const loadCurrentPlan = async (): Promise<CurrentPlan> => {
  const none: CurrentPlan = { subscribed: false }
  const cookieStore = await cookies()
  if (!cookieStore.has(SESSION_COOKIE)) return none
  const cookie = cookieStore.toString()

  try {
    const session = await getMeAPI({ cookie })
    if (session.role !== USER_TYPES.provider) return none
    const { effectivePlan, billing } = await getProviderPlanAPI({ cookie })
    return { plan: effectivePlan, subscribed: billing !== null && billing.status !== BILLING_STATUSES.canceled }
  } catch (error) {
    if (classifyError(error).kind !== 'unauthorized') reportError(error, 'pricing:plan')
    return none
  }
}

export default async function Pricing() {
  const [t, tPlans, plans, addons, { plan: currentPlan, subscribed }] = await Promise.all([
    getTranslations('Pricing'),
    getTranslations('Plans'),
    getPlansAPI(),
    getAddonsAPI(),
    loadCurrentPlan(),
  ])
  const purchasable = new Map(plans.map(({ id, purchasable }) => [id, purchasable]))
  const sellsAny = plans.some(({ purchasable }) => purchasable) || addons.some(({ purchasable }) => purchasable)

  return (
    <PageShell className='flex flex-col gap-10'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className='flex flex-col gap-3'>
        <Surface className='flex flex-col gap-4'>
          <PlanComparisonTable
            plans={plans}
            currentPlan={currentPlan}
            caption={t('title')}
            renderAction={(plan) => (
              <PricingPlanAction
                plan={plan}
                currentPlan={currentPlan}
                subscribed={subscribed}
                purchasable={purchasable.get(plan) ?? false}
              />
            )}
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

      <PricingAiFeatures plans={plans} />

      {addons.length > 0 && (
        <Section title={t('addonsTitle')} description={t('addonsSubtitle')}>
          <div className='flex flex-col gap-3'>
            <AddonCatalogue
              addons={addons}
              renderAction={(addon) => <PricingAddonAction addon={addon} currentPlan={currentPlan} />}
            />
            <AppParagraph size='body-sm' className='m-0'>
              {t('addonsBundleNote', { plan: tPlans(`names.${PLANS.basic}`) })}
            </AppParagraph>
          </div>
        </Section>
      )}

      <PricingIncluded />
      <PricingFaq />
    </PageShell>
  )
}

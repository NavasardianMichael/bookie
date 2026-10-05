import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CHECKOUT_PLAN_QUERY } from '@constants/billing'
import { PLAN_ORDER, PLANS } from '@constants/plans'
import { PageShell } from '@components/ui/layout'
import { BillingReturnClient } from './BillingReturnClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Billing')
  return { title: t('returnTitle'), robots: { index: false, follow: false } }
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Where a completed checkout lands: waits for Paddle's webhook to apply the plan, then says
 * so. Behind the proxy's cookie guard — it polls the provider's own plan.
 *
 * `plan` is narrowed to a paid plan here; anything else (a payment started from Paddle's own
 * emails carries none) shows a plain "payment received" rather than waiting on nothing.
 */
export default async function BillingReturn({ searchParams }: Props) {
  const raw = (await searchParams)[CHECKOUT_PLAN_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  const plan = PLAN_ORDER.find((candidate) => candidate === value && candidate !== PLANS.free) ?? null

  return (
    <PageShell width='prose' className='flex flex-col items-center gap-6 py-16'>
      <BillingReturnClient plan={plan} />
    </PageShell>
  )
}

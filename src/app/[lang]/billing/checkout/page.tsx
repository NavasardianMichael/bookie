import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CHECKOUT_PLAN_QUERY, PADDLE_TRANSACTION_QUERY } from '@constants/billing'
import { PageShell } from '@components/ui/layout'
import { BillingCheckoutClient } from './BillingCheckoutClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Billing')
  return { title: t('checkoutTitle'), robots: { index: false, follow: false } }
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value)

/**
 * Where Paddle sends a checkout — the transaction's `checkout.url`, and the default payment
 * link in Paddle's settings. Paddle Billing has no hosted checkout page: it answers
 * `/[lang]/billing/checkout?_ptxn=txn_…`, and Paddle.js, loaded here, opens its overlay on
 * seeing `_ptxn`. See docs/PADDLE_SETUP.md.
 *
 * **Public**, unlike the return page: Paddle also links here from its own emails (a renewal
 * to pay), which a provider may open signed out. The query is read here, in the Server
 * Component, rather than with `useSearchParams` — `next/navigation` is a grep gate.
 */
export default async function BillingCheckout({ searchParams }: Props) {
  const query = await searchParams
  const transactionId = first(query[PADDLE_TRANSACTION_QUERY])
  const plan = first(query[CHECKOUT_PLAN_QUERY])

  return (
    <PageShell width='prose' className='flex flex-col items-center gap-6 py-16'>
      <BillingCheckoutClient transactionId={transactionId} plan={plan} />
    </PageShell>
  )
}

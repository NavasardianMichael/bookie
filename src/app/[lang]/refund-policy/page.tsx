import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { LegalDocument } from '@components/legal/LegalDocument'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Legal')

  return {
    title: t('refundMetaTitle'),
    description: t('refundMetaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.refundPolicy]),
  }
}

/**
 * The Refund Policy for provider subscriptions — required by Paddle, with Terms and Privacy,
 * before it approves the site for live payments. Linked from the pricing FAQ and the Terms.
 */
export default function RefundPolicy() {
  return <LegalDocument document='refund' />
}

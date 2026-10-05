import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { LegalDocument } from '@components/legal/LegalDocument'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Legal')

  return {
    title: t('termsMetaTitle'),
    description: t('termsMetaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.terms]),
  }
}

/**
 * The Terms of Service. Registration's consent notice links here, and Paddle requires the
 * page — naming Paddle as Merchant of Record — before it approves the site for live payments.
 */
export default function Terms() {
  return <LegalDocument document='terms' />
}

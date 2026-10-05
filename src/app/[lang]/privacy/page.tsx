import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { LegalDocument } from '@components/legal/LegalDocument'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Legal')

  return {
    title: t('privacyMetaTitle'),
    description: t('privacyMetaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.privacy]),
  }
}

/**
 * The Privacy Policy. Registration's consent notice links here; Paddle requires it too. It
 * names what the app actually holds — keep it in step with the schema and the processors.
 */
export default function Privacy() {
  return <LegalDocument document='privacy' />
}

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { PageHeader, PageShell } from '@components/ui/layout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Legal')

  return {
    title: t('privacyMetaTitle'),
    description: t('privacyMetaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.privacy]),
  }
}

/**
 * Placeholder with a live URL — see the note in `terms/page.tsx`. Registration links here
 * from its consent notice, so the route has to resolve.
 */
export default async function Privacy() {
  const t = await getTranslations('Legal')

  return (
    <PageShell as='article' width='prose' className='flex flex-col gap-6'>
      <PageHeader title={t('privacyTitle')} subtitle={t('unpublished')} />
      <AppParagraph>
        {t.rich('privacyBody', {
          contact: (chunks) => <AppLink href={ROUTES.contact}>{chunks}</AppLink>,
        })}
      </AppParagraph>
    </PageShell>
  )
}

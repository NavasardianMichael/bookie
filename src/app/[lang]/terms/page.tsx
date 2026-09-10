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
    title: t('termsMetaTitle'),
    description: t('termsMetaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.terms]),
  }
}

/**
 * Placeholder with a live URL rather than the prototype's `href="#"`.
 *
 * The registration screens are required to link here, and shipping a dead anchor from a
 * consent notice is worse than saying plainly that the document is not published yet. No
 * invented legal text — the real terms replace this wholesale.
 */
export default async function Terms() {
  const t = await getTranslations('Legal')

  return (
    <PageShell as='article' width='prose' className='flex flex-col gap-6'>
      <PageHeader title={t('termsTitle')} subtitle={t('unpublished')} />
      <AppParagraph>
        {t.rich('termsBody', {
          contact: (chunks) => <AppLink href={ROUTES.contact}>{chunks}</AppLink>,
        })}
      </AppParagraph>
    </PageShell>
  )
}

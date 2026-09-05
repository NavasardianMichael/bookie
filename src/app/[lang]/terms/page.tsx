import type { Metadata } from 'next'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { PageHeader, PageShell } from '@components/ui/layout'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Terms of Service',
    description: 'The terms that govern your use of Bookie.',
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
export default function Terms() {
  return (
    <PageShell as='article' width='prose' className='flex flex-col gap-6'>
      <PageHeader title='Terms of Service' subtitle='Not yet published.' />
      <AppParagraph>
        Bookie&apos;s terms of service are still being finalised. Until they are published here, questions about how the
        platform may be used are answered directly — reach us via the{' '}
        <AppLink href={ROUTES.contact}>contact page</AppLink>.
      </AppParagraph>
    </PageShell>
  )
}

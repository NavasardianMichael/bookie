import type { Metadata } from 'next'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { PageHeader, PageShell } from '@components/ui/layout'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Privacy Policy',
    description: 'What Bookie collects and how it is handled.',
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.privacy]),
  }
}

/**
 * Placeholder with a live URL — see the note in `terms/page.tsx`. Registration links here
 * from its consent notice, so the route has to resolve.
 */
export default function Privacy() {
  return (
    <PageShell as='article' width='prose' className='flex flex-col gap-6'>
      <PageHeader title='Privacy Policy' subtitle='Not yet published.' />
      <AppParagraph>
        Bookie&apos;s privacy policy is still being finalised. Registration collects a phone number, a name and
        optionally an email address; the phone number is what identifies an account. For anything else, reach us via the{' '}
        <AppLink href={ROUTES.contact}>contact page</AppLink>.
      </AppParagraph>
    </PageShell>
  )
}

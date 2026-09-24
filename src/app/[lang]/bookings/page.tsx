import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { GenerateMetadata } from '@interfaces/components'
import { PageShell } from '@components/ui/layout'
import { BookingsClient } from './BookingsClient'

export const dynamic = 'force-dynamic'

/** Private to the account, so `noindex` and no `alternates` — there is nothing to crawl. */
export const generateMetadata: GenerateMetadata<unknown> = async (): Promise<Metadata> => {
  const t = await getTranslations('Bookings')

  return {
    title: t('title'),
    robots: { index: false, follow: false },
  }
}

export default function BookingsPage() {
  return (
    <PageShell>
      <BookingsClient />
    </PageShell>
  )
}

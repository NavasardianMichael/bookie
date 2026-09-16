import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { GenerateMetadata } from '@interfaces/components'
import { PageShell } from '@components/ui/layout'
import { AdminReviewsClient } from './AdminReviewsClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lang: string }>
}

/**
 * `noindex`, and not merely by convention.
 *
 * The page itself is harmless — it renders nothing without the grant, because the API
 * answers `/admin/*` with 404 to everyone not on the `ADMIN_EMAILS` allowlist. But an
 * indexed moderation URL advertises that the surface exists and invites people to probe
 * it, so it is kept out of search results and out of `sitemap.ts`. It also carries no
 * `alternates`: there is one operator reading this, not fifteen locale variants worth
 * crawling.
 */
export const generateMetadata: GenerateMetadata<Props> = async (): Promise<Metadata> => {
  const t = await getTranslations('Admin')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default function AdminReviewsPage() {
  return (
    <PageShell className='flex flex-col gap-6'>
      <AdminReviewsClient />
    </PageShell>
  )
}

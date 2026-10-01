import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { GenerateMetadata } from '@interfaces/components'
import { ROUTE_KEYS } from '@constants/routes'
import { PageShell } from '@components/ui/layout'
import { AdminProvidersClient } from './AdminProvidersClient'
import { AdminNav } from '../AdminNav'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lang: string }>
}

/** `noindex` and out of the sitemap, for the reason `admin/reviews/page.tsx` gives. */
export const generateMetadata: GenerateMetadata<Props> = async (): Promise<Metadata> => {
  const t = await getTranslations('Admin.providers')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default function AdminProvidersPage() {
  return (
    <PageShell className='flex flex-col gap-6'>
      <AdminNav current={ROUTE_KEYS.adminProviders} />
      <AdminProvidersClient />
    </PageShell>
  )
}

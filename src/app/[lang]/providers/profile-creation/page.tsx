import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ProviderProfileForm } from '@components/providerProfileForm/ProviderProfileForm'
import { PageHeader, PageShell } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ProfileCreation')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ProfileCreation() {
  const t = await getTranslations('ProfileCreation')

  return (
    <PageShell width='form' className='flex flex-col gap-6'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <ProviderProfileForm />
    </PageShell>
  )
}

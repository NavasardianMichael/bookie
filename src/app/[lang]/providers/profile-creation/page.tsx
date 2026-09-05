import { Metadata } from 'next'
import { ProviderProfileForm } from '@components/providerProfileForm/ProviderProfileForm'
import { PageHeader, PageShell } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

export default function ProfileCreation() {
  return (
    <PageShell width='form' className='flex flex-col gap-6'>
      <PageHeader title="Let's get started" subtitle='Fill in the primary information for your profile.' />
      <ProviderProfileForm />
    </PageShell>
  )
}

import { Metadata } from 'next'
import { PageHeader, PageShell } from '@components/ui/layout'
import { ProviderServices } from './ProviderServices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your Services',
  description: 'Create and manage the services clients can book.',
}

export default function ProviderServicesPage() {
  return (
    <PageShell className='flex flex-col gap-6'>
      <PageHeader title='Manage services' subtitle='Configure your offerings, durations, and pricing.' />
      <ProviderServices />
    </PageShell>
  )
}

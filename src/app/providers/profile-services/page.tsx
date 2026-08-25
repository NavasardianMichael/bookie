import { Metadata } from 'next'
import { PageHeader, PageShell } from '@components/ui/layout'
import ProviderServices from './ProviderServices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookie | Your Services',
  description: 'Create and manage the services clients can book.',
}

const ProviderServicesPage = () => (
  <PageShell width='form' className='flex flex-col gap-6'>
    <PageHeader title='Your services' subtitle='Add at least one service so clients can book you.' />
    <ProviderServices />
  </PageShell>
)

export default ProviderServicesPage

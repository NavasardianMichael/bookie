import type { Metadata } from 'next'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell } from '@components/ui/layout'

export const metadata: Metadata = {
  title: 'Categories List',
  description: 'Categories List Page',
}

const Categories = async () => (
  <PageShell className='flex flex-col gap-6'>
    <PageHeader title='Categories' subtitle='Browse providers and organizations by what they do.' />
    <EmptyState title='Coming soon' description='Category browsing is not available yet.' />
  </PageShell>
)

export default Categories

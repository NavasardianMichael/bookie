import type { Metadata } from 'next'
import { getCategoriesListAPI } from '@api/categories/main'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { CategoryCard } from './components/CategoryCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse providers and organizations by what they do.',
}

const Categories = async () => {
  const { allIds, byId } = await getCategoriesListAPI()

  return (
    <PageShell className='flex flex-col gap-6'>
      <PageHeader
        title='Categories'
        subtitle={allIds.length ? `${allIds.length} listed` : 'Browse by specialty'}
      />

      {allIds.length ? (
        <ResponsiveGrid as='ul'>
          {allIds.map((categoryId) => (
            <li key={categoryId}>
              <CategoryCard data={byId[categoryId!]} />
            </li>
          ))}
        </ResponsiveGrid>
      ) : (
        <EmptyState title='No categories yet' description='Categories will appear here once they are added.' />
      )}
    </PageShell>
  )
}

export default Categories

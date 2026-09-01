import { getCategoriesListLDSchema } from '@linkedDataSchema/categories'
import type { Metadata } from 'next'
import { getCategoriesListAPI } from '@api/categories/main'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import JsonLd from '@components/ui/bare/JsonLd'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { CategoryCard } from './components/CategoryCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse providers and organizations by what they do.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.categories] },
}

const Categories = async () => {
  const { allIds, byId } = await getCategoriesListAPI()
  const categories = allIds.map((categoryId) => byId[categoryId!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getCategoriesListLDSchema(categories)} />

      <PageHeader
        title='Categories'
        subtitle={allIds.length ? `${allIds.length} listed` : 'Browse by specialty'}
      />

      {categories.length ? (
        <ResponsiveGrid as='ul'>
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard data={category} headingLevel={2} />
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

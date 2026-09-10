import { getCategoriesListLDSchema } from '@linkedDataSchema/categories'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getCategoriesListAPI } from '@api/categories/main'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'
import { CategoryCard } from './components/CategoryCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Categories')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.categories]),
  }
}

export default async function Categories() {
  const [{ allIds, byId }, t, tCommon] = await Promise.all([
    getCategoriesListAPI(),
    getTranslations('Categories'),
    getTranslations('Common'),
  ])
  const categories = allIds.map((categoryId) => byId[categoryId!])

  return (
    <PageShell className='flex flex-col gap-6'>
      <JsonLd data={getCategoriesListLDSchema(categories)} />

      <PageHeader
        title={t('title')}
        subtitle={allIds.length ? tCommon('listed', { count: allIds.length }) : t('browseSpecialty')}
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
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
      )}
    </PageShell>
  )
}

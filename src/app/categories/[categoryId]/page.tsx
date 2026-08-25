import { OrganizationCard } from '@app/organizations/components/OrganizationCard'
import { ProviderCard } from '@app/providers/ProviderCard'
import { getCategoryAPI } from '@api/categories/main'
import { Category as CategoryType } from '@store/categories/single/types'
import { GenerateMetadata } from '@interfaces/components'
import EmptyState from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid, Section } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{
    categoryId: CategoryType['id']
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const generateMetadata: GenerateMetadata<Props> = async ({ params }) => {
  const { categoryId } = await params
  const category = await getCategoryAPI({
    id: categoryId,
  })

  return {
    title: `Bookie | ${category.name}`,
    description: `Browse ${category.name} providers and organizations`,
    keywords: `Bookie, ${category.name}, healthcare, medical services`,
    classification: category.name,
  }
}

const Category = async ({ params }: Props) => {
  const { categoryId } = await params

  const category = await getCategoryAPI({
    id: categoryId,
  })

  const isEmpty = !category.organizations.length && !category.providers.length

  return (
    <PageShell as='article' className='flex flex-col gap-8'>
      <PageHeader title={category.name} />

      {isEmpty && (
        <EmptyState
          title='Nothing here yet'
          description={`No providers or organizations are listed under ${category.name} so far.`}
        />
      )}

      {/* The same cards render through the same grid as the list pages — they used
          to stack full-width here and sit at 1/8 width on /providers. */}
      {!!category.organizations.length && (
        <Section title='Organizations' count={category.organizations.length}>
          <ResponsiveGrid as='ul'>
            {category.organizations.map((organization) => (
              <li key={organization.id}>
                <OrganizationCard data={organization} hideCategories />
              </li>
            ))}
          </ResponsiveGrid>
        </Section>
      )}

      {!!category.providers.length && (
        <Section title='Providers' count={category.providers.length}>
          <ResponsiveGrid as='ul'>
            {category.providers.map((provider) => (
              <li key={provider.id}>
                <ProviderCard data={provider} />
              </li>
            ))}
          </ResponsiveGrid>
        </Section>
      )}
    </PageShell>
  )
}

export default Category

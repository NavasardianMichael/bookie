import { OrganizationCard } from '@app/organizations/components/OrganizationCard'
import { ProviderCard } from '@app/providers/ProviderCard'
import { Divider } from 'antd'
import Title from 'antd/es/typography/Title'
import { getCategoryAPI } from '@api/categories/main'
import { Category as CategoryType } from '@store/categories/single/types'
import { GenerateMetadata } from '@interfaces/components'

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

  return (
    <article>
      <div className='flex flex-col gap-6 grow'>
        <div>
          <h1 className='text-2xl mb-2 font-bold'>{category.name}</h1>
          <p className='text-gray-600'>Browse {category.name.toLowerCase()} providers and organizations</p>
        </div>

        <Title level={3}>Organizations</Title>
        {category.organizations.map((organization) => {
          return <OrganizationCard key={organization.id} data={organization} />
        })}

        <Divider />

        <Title level={3}>Providers</Title>
        {category.providers.map((provider) => {
          return <ProviderCard key={provider.id} data={provider} />
        })}
      </div>
    </article>
  )
}

export default Category

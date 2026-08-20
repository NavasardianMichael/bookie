import { FC } from 'react'
import { Tag } from 'antd'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTES } from '@constants/routes'
import EntityCard from '@components/ui/EntityCard'

type Props = {
  data: BasicOrganization
  hideCategories?: boolean
}

export const OrganizationCard: FC<Props> = ({ data, hideCategories }) => {
  const { basic } = data

  return (
    <EntityCard
      href={`${ROUTES.organizations}/${data.id}`}
      title={basic.name}
      description={basic.description}
      aspect='16/9'
      badges={
        // hideCategories used to be accepted and then silently ignored.
        hideCategories
          ? undefined
          : basic.categories?.slice(0, 2).map((category) => <Tag key={category.id}>{category.name}</Tag>)
      }
    />
  )
}

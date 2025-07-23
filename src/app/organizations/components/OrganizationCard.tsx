import { FC } from 'react'
import { Card } from 'antd'
import Meta from 'antd/es/card/Meta'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'
import { OrganizationCardDetails } from './OrganizationCardDetails'

type Props = {
  data: BasicOrganization
  hideCategories?: boolean
}

export const OrganizationCard: FC<Props> = ({ data, hideCategories }) => {
  return (
    <Card>
      <AppLink href={`${ROUTES.organizations}/${data.id}`}>
        <Meta
          title={data.basic.name}
          description={<OrganizationCardDetails data={data} hideCategories={hideCategories} />}
        />
      </AppLink>
    </Card>
  )
}

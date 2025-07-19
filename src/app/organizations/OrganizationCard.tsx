'use client'

import { FC } from 'react'
import { Card } from 'antd'
import Meta from 'antd/es/card/Meta'
import Title from 'antd/es/typography/Title'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'

type Props = {
  data: BasicOrganization
}

export const OrganizationCard: FC<Props> = ({ data }) => {
  return (
    <Card>
      <AppLink href={`${ROUTES.organizations}/${data.id}`}>
        <Meta
          title={
            <Title level={3} className='text-lg'>
              {data.basic.name}
            </Title>
          }
          description='This is the description'
        />
      </AppLink>
    </Card>
  )
}

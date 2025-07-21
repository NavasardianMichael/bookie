'use client'

import { FC, MouseEventHandler, useMemo } from 'react'
import { Card } from 'antd'
import Meta from 'antd/es/card/Meta'
import Title from 'antd/es/typography/Title'
import { useRouter } from 'next/router'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'
import { OrganizationCardDetails } from './OrganizationCardDetails'

type Props = {
  data: BasicOrganization
  onEntityClick?: MouseEventHandler<HTMLButtonElement>
}

export const OrganizationCard: FC<Props> = ({ data, onEntityClick }) => {
  const { push } = useRouter()

  const onEntityClickHandler: MouseEventHandler<HTMLButtonElement> = useMemo(() => {
    if (onEntityClick) return onEntityClick
    return (event) => {
      event.preventDefault()
      push(event.currentTarget.name)
    }
  }, [onEntityClick, push])

  return (
    <Card>
      <AppLink href={`${ROUTES.organizations}/${data.id}`}>
        <Meta
          title={
            <Title level={3} className='text-lg'>
              {data.basic.name}
            </Title>
          }
          description={<OrganizationCardDetails data={data} onEntityClick={onEntityClickHandler} />}
        />
      </AppLink>
    </Card>
  )
}

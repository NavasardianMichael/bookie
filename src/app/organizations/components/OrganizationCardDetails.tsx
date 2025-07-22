'use client'

import { FC, MouseEventHandler } from 'react'
import { Button, Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTE_KEYS } from '@constants/routes'

type Props = {
  data: BasicOrganization
  onEntityClick: MouseEventHandler<HTMLButtonElement>
  hideCategories?: boolean
}

export const OrganizationCardDetails: FC<Props> = ({ data, onEntityClick, hideCategories }) => {
  return (
    <Flex vertical gap={4}>
      {hideCategories &&
        data.basic.categories.map((category) => (
          <Button
            type='dashed'
            key={category.id}
            data-entity-name={ROUTE_KEYS.categories}
            data-entity-id={category.id}
            onClick={onEntityClick}
            className='w-fit'
          >
            #{category.name}
          </Button>
        ))}
      <Paragraph>{data.basic.description}</Paragraph>
    </Flex>
  )
}

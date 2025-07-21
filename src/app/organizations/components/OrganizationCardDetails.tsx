'use client'

import { FC, MouseEventHandler } from 'react'
import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { BasicOrganization } from '@store/organizations/single/types'

type Props = {
  data: BasicOrganization
  onEntityClick: MouseEventHandler<HTMLButtonElement>
}

export const OrganizationCardDetails: FC<Props> = ({ data, onEntityClick }) => {
  return (
    <Flex vertical gap={4}>
      {data.basic.categories.map((category) => (
        <button key={category.id} onClick={onEntityClick} name={category.id}>
          #{category.name}
        </button>
      ))}
      <Paragraph>{data.basic.description}</Paragraph>
    </Flex>
  )
}

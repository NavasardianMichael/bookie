'use client'

import { FC, MouseEventHandler } from 'react'
import { Flex } from 'antd'
import { BasicCategory } from '@store/categories/single/types'

type Props = {
  data: BasicCategory
  onEntityClick: MouseEventHandler<HTMLButtonElement>
}

export const CategoryCardDetails: FC<Props> = ({ data, onEntityClick }) => {
  return (
    <Flex vertical gap={4}>
      {data.organizations.map((organization) => (
        <button key={organization.id} name={organization.id} onClick={onEntityClick}>
          #{organization.basic.name}
        </button>
      ))}
    </Flex>
  )
}

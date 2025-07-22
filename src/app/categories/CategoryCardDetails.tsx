'use client'

import { FC } from 'react'
import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { BasicCategory } from '@store/categories/single/types'

type Props = {
  data: BasicCategory
}

export const CategoryCardDetails: FC<Props> = ({ data }) => {
  return (
    <Flex vertical gap={4}>
      <button>{data.name}</button>
      <Paragraph>Browse {data.name.toLowerCase()} providers and organizations</Paragraph>
    </Flex>
  )
}

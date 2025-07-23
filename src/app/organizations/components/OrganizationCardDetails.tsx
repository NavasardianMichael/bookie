import { FC } from 'react'
import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { BasicOrganization } from '@store/organizations/single/types'

type Props = {
  data: BasicOrganization
  hideCategories?: boolean
}

export const OrganizationCardDetails: FC<Props> = ({ data }) => {
  return (
    <Flex vertical gap={4}>
      <Paragraph>{data.basic.description}</Paragraph>
    </Flex>
  )
}

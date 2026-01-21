import { FC } from 'react'
import { Flex, Typography } from 'antd'
import { BasicOrganization } from '@store/organizations/single/types'

type Props = {
  data: BasicOrganization
  hideCategories?: boolean
}

export const OrganizationCardDetails: FC<Props> = ({ data }) => {
  return (
    <Flex vertical gap={4}>
      <Typography.Paragraph>{data.basic.description}</Typography.Paragraph>
    </Flex>
  )
}

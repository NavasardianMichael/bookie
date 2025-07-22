import { FC, MouseEventHandler } from 'react'
import { Button, Flex } from 'antd'
import { BasicCategory } from '@store/categories/single/types'
import { ROUTE_KEYS } from '@constants/routes'

type Props = {
  data: BasicCategory
  onEntityClick: MouseEventHandler<HTMLButtonElement>
}

export const CategoryCardDetails: FC<Props> = ({ data, onEntityClick }) => {
  return (
    <Flex vertical gap={4}>
      {data.organizations.map((organization) => (
        <Button
          type='primary'
          key={organization.id}
          data-entity-name={ROUTE_KEYS.organizations}
          data-entity-id={organization.id}
          onClick={onEntityClick}
        >
          #{organization.basic.name}
        </Button>
      ))}
    </Flex>
  )
}

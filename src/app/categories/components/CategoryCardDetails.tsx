import { FC, MouseEventHandler } from 'react'
import { Flex } from 'antd'
import { BasicCategory } from '@store/categories/single/types'
import { ROUTE_KEYS } from '@constants/routes'
import AppButton from '@components/ui/AppButton'

type Props = {
  data: BasicCategory
  onEntityClick: MouseEventHandler<HTMLButtonElement>
}

export const CategoryCardDetails: FC<Props> = ({ data, onEntityClick }) => {
  return (
    <Flex vertical gap={4}>
      {data.organizations.map((organization) => (
        <AppButton
          type='primary'
          key={organization.id}
          data-entity-name={ROUTE_KEYS.organizations}
          data-entity-id={organization.id}
          onClick={onEntityClick}
        >
          #{organization.basic.name}
        </AppButton>
      ))}
    </Flex>
  )
}

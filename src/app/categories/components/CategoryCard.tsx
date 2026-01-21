'use client'

import { FC, MouseEventHandler } from 'react'
import { Card, Typography } from 'antd'
import { BasicCategory } from '@store/categories/single/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/ui/AppLink'
import { CategoryCardDetails } from './CategoryCardDetails'

type Props = {
  data: BasicCategory
  onEntityClick: MouseEventHandler<HTMLButtonElement>
}

export const CategoryCard: FC<Props> = ({ data, onEntityClick }) => {
  return (
    <Card>
      <AppLink href={`${ROUTES.categories}/${data.id}`}>
        <Card.Meta
          title={
            <Typography.Title level={3} className='text-lg'>
              {data.name}
            </Typography.Title>
          }
          description={<CategoryCardDetails data={data} onEntityClick={onEntityClick} />}
        />
      </AppLink>
    </Card>
  )
}

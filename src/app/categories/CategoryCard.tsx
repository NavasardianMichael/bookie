'use client'

import { FC } from 'react'
import { Card } from 'antd'
import Meta from 'antd/es/card/Meta'
import Title from 'antd/es/typography/Title'
import { BasicCategory } from '@store/categories/single/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'
import { CategoryCardDetails } from './CategoryCardDetails'

type Props = {
  data: BasicCategory
}

export const CategoryCard: FC<Props> = ({ data }) => {
  return (
    <Card>
      <AppLink href={`${ROUTES.categories}/${data.id}`}>
        <Meta
          title={
            <Title level={3} className='text-lg'>
              {data.name}
            </Title>
          }
          description={<CategoryCardDetails data={data} />}
        />
      </AppLink>
    </Card>
  )
}

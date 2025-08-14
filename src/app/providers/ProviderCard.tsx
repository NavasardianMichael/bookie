'use client'

import { FC } from 'react'
import { Card, Image } from 'antd'
import Meta from 'antd/es/card/Meta'
import Title from 'antd/es/typography/Title'
import { BasicProvider } from '@store/providers/list/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/ui/AppLink'

type Props = {
  data: BasicProvider
}

export const ProviderCard: FC<Props> = ({ data }) => {
  return (
    <article>
      <Card
        cover={<Image preview={false} alt={`${data.basic.firstName} ${data.basic.lastName}`} src={data.basic.image} />}
      >
        <AppLink href={`${ROUTES.providers}/${data.id}`}>
          <Meta
            title={
              <Title level={3} className='text-lg'>
                {data.basic.firstName} {data.basic.lastName}
              </Title>
            }
            description='This is the description'
          />
        </AppLink>
      </Card>
    </article>
  )
}

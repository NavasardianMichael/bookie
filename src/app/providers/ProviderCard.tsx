import { FC } from 'react'
import { Card, Image } from 'antd'
import Meta from 'antd/es/card/Meta'
import Title from 'antd/es/typography/Title'
import { BasicProvider } from '@store/providers/profile/types'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'

type Props = {
  data: BasicProvider
}

export const ProviderCard: FC<Props> = ({ data }) => {
  return (
    <Card
      cover={
        <Image
          alt="example"
          src="https://st3.depositphotos.com/9998432/13335/v/450/depositphotos_133352010-stock-illustration-default-placeholder-man-and-woman.jpg"
        />
      }
    >
      <AppLink href={`${ROUTES.providers}/${data.id}`}>
        <Meta
          title={
            <Title level={3} className="text-lg">
              {data.basic.firstName} {data.basic.lastName}
            </Title>
          }
          description="This is the description"
        />
      </AppLink>
    </Card>
  )
}

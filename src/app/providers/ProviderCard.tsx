import AppLink from '@components/shared/AppLink'
import { ROUTES } from '@constants/routes'
import { Provider } from '@interfaces/provider'
import { Card, Image } from 'antd'
import Meta from 'antd/es/card/Meta'
import Title from 'antd/es/typography/Title'
import { FC } from 'react'

type Props = {
    data: Provider
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
                    title={<Title level={3} className='text-lg'>{data.name}</Title>}
                    description="This is the description"
                />
            </AppLink>
        </Card>

    )
}

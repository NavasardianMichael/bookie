import AppLink from '@components/shared/AppLink'
import { ROUTES } from '@constants/routes'
import { Provider } from '@interfaces/provider'
import { Avatar, Card, Image } from 'antd'
import React, { FC } from 'react'
import Meta from 'antd/es/card/Meta';
import Title from 'antd/es/typography/Title';

type Props = {
    data: Provider
}

export const ProviderCard: FC<Props> = ({ data }) => {
    return (
        <AppLink href={`${ROUTES.providers}/${data.id}`} className='w-full sm:w-[calc(50%-0.75rem)] md:w-[calc(33.33%-1rem)] lg:w-[calc(25%-1.25rem)] xl:w-[calc(20%-1.5rem)] p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 box-border'>
            <Card
                cover={
                    <Image
                        alt="example"
                        src="https://st3.depositphotos.com/9998432/13335/v/450/depositphotos_133352010-stock-illustration-default-placeholder-man-and-woman.jpg"
                    />
                }

            >
                <Meta
                    avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=8" />}
                    title={<Title level={3} className='text-lg'>{data.name}</Title>}
                    description="This is the description"
                />
            </Card>
        </AppLink>

    )
}

import AppLink from '@components/shared/AppLink'
import { ROUTES } from '@constants/routes'
import { MOCK_PROVIDERS } from '@mock/providers'
import React from 'react'

const Providers = () => {
    return (
        <div className='flex gap-4'>{
            MOCK_PROVIDERS.map((provider) => {
                return (
                    <AppLink key={provider.id} href={`${ROUTES.providers}/${provider.id}`}>
                        <h2>{provider.name}</h2>
                    </AppLink>
                )
            })}</div>
    )
}

export default Providers
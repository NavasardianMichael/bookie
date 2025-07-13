'use client'

import { useEffect } from 'react'
import { useProvidersListStore } from '@store/providers/list/store'
import { ProviderCard } from './ProviderCard'

export const ProvidersList = () => {
  const { getProvidersList, list } = useProvidersListStore()

  useEffect(() => {
    getProvidersList()
  }, [getProvidersList])

  return (
    <div className='app-responsive-flex'>
      {list.allIds.map((providerId) => {
        const provider = list.byId[providerId]
        return <ProviderCard key={provider.id} data={provider} />
      })}
    </div>
  )
}

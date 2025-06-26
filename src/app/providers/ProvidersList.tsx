'use client'

import { useEffect } from 'react'
import { useProvidersListStore } from '@store/providers/list/store'
import { ProviderCard } from './ProviderCard'

export const ProvidersList = () => {
  console.log({
    API_URL: process.env.API_URL,
  })

  const { fetchProvidersList, list } = useProvidersListStore()

  useEffect(() => {
    fetchProvidersList()
  }, [])

  return (
    <div className="app-responsive-flex">
      {list.allIds.map((providerId) => {
        const provider = list.byId[providerId]
        return <ProviderCard key={provider.id} data={provider} />
      })}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useOrganizationsListStore } from '@store/organizations/list/store'
import { useEntityClickHandler } from '@hooks/useEntityClickHandler'
import { OrganizationCard } from './OrganizationCard'

export const OrganizationsList = () => {
  const { getOrganizationsList, list } = useOrganizationsListStore()

  useEffect(() => {
    getOrganizationsList()
  }, [getOrganizationsList])

  const onEntityClick = useEntityClickHandler()

  return (
    <div className='app-responsive-flex'>
      {list.allIds.map((organizationId) => {
        const organization = list.byId[organizationId!]
        return <OrganizationCard key={organization.id} data={organization} onEntityClick={onEntityClick} />
      })}
    </div>
  )
}

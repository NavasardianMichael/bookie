'use client'

import { MouseEventHandler, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationsListStore } from '@store/organizations/list/store'
import { OrganizationCard } from './OrganizationCard'

export const OrganizationsList = () => {
  const { push } = useRouter()
  const { getOrganizationsList, list } = useOrganizationsListStore()

  useEffect(() => {
    getOrganizationsList()
  }, [getOrganizationsList])

  const onEntityClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.preventDefault()
      push(event.currentTarget.name)
    },
    [push]
  )

  return (
    <div className='app-responsive-flex'>
      {list.allIds.map((organizationId) => {
        const organization = list.byId[organizationId!]
        return <OrganizationCard key={organization.id} data={organization} onEntityClick={onEntityClick} />
      })}
    </div>
  )
}

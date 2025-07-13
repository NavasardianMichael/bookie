'use client'

import { FC, useEffect } from 'react'
import { Provider } from '@store/providers/profile/types'
import { useProviderStore } from '@store/providers/single/store'
import ProviderCalendar from './Calendar'

type Props = {
  initialState: Provider
}

const ProviderDetails: FC<Props> = ({ initialState }) => {
  const providerStore = useProviderStore()

  useEffect(() => {
    providerStore.setProviderState(initialState)
  }, [providerStore, initialState])

  return (
    <>
      <h3 className='mb-0'>Provider Details</h3>
      <ProviderCalendar />
    </>
  )
}

export default ProviderDetails

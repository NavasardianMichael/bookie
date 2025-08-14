'use client'

import { FC, useEffect } from 'react'
import { useSingleProviderStore } from '@store/providers/single/store'
import { SingleProvider } from '@store/providers/single/types'
import ProviderCalendar from './Calendar'

type Props = {
  initialState: SingleProvider
}

const ProviderDetails: FC<Props> = ({ initialState }) => {
  const providerStore = useSingleProviderStore()

  useEffect(() => {
    providerStore.setSingleProviderState(JSON.parse(JSON.stringify(initialState)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* <h3 className='mb-0'>Provider Details</h3> */}
      <ProviderCalendar />
    </>
  )
}

export default ProviderDetails

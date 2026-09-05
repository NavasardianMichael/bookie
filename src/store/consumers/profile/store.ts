import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { appendSelectors } from '@store/appendSelectors'
import { DEFAULT_CONSUMER_NOTIFICATION_PREFS } from '@constants/settings'
import { ConsumerProfileActions, ConsumerProfileState } from './types'

const initialState: ConsumerProfileState = {
  id: '',
  basic: {
    firstName: '',
    lastName: '',
    phoneNumber: '',
  },
  details: {
    favoriteProviders: [],
    emailNotificationPrefs: { ...DEFAULT_CONSUMER_NOTIFICATION_PREFS },
  },
  isPending: false,
  error: null,
}

const useConsumerProfileStoreBase = create<ConsumerProfileState & ConsumerProfileActions>()(
  immer(
    combine(
      initialState,
      (set): ConsumerProfileActions => ({
        setConsumerProfileState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
      })
    )
  )
)

export const useConsumerProfileStore = appendSelectors(useConsumerProfileStoreBase)

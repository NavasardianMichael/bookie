import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getProviderBookingsAPI } from '@api/appointments/main'
import { appendSelectors } from '@store/appendSelectors'
import { ProviderApprovalsActions, ProviderApprovalsState } from './types'

const initialState: ProviderApprovalsState = {
  count: 0,
  isPending: false,
  error: null,
}

export const useProviderApprovalsStoreBase = create<ProviderApprovalsState & ProviderApprovalsActions>()(
  immer(
    combine(
      initialState,
      (set): ProviderApprovalsActions => ({
        setProviderApprovalsState: (payload) => {
          set((state) => {
            return {
              ...state,
              ...payload,
            }
          })
        },
        /**
         * `perPage: 1` because only `total` is wanted — the paged bookings endpoint
         * already answers this question, and a count-only route would be a second way
         * to ask it that could disagree with the list the badge is counting.
         *
         * A failure leaves the previous count standing rather than zeroing it: a badge
         * that vanishes on a dropped request tells the provider their queue is clear,
         * which is the one wrong thing it could say. The layout renders no error for
         * the same reason — a sidebar is not where a fetch failure is actionable.
         */
        getPendingApprovalsCount: async () => {
          const { total } = await getProviderBookingsAPI({ status: ['pending'], perPage: 1 })

          set((state) => {
            state.count = total
          })
        },
      })
    )
  )
)

export const useProviderApprovalsStore = appendSelectors(useProviderApprovalsStoreBase)

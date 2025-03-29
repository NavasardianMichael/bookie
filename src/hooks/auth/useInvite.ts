import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { inviteUserThunk } from 'store/profile/thunk'
import { Profile } from 'store/profile/types'
import { PRIVATE_PAGES } from 'helpers/constants/pages'
import { isRejectedAction } from 'helpers/functions/store'
import { useAppDispatch } from '../useAppDispatch'

export const useInvite = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  return useCallback(
    async (values: Pick<Profile, 'email' | 'role'>) => {
      const res = await dispatch(inviteUserThunk(values))

      if (isRejectedAction(res)) return

      navigate(PRIVATE_PAGES.invitationConfirm, {
        state: {
          invitationData: values,
        },
      })
    },
    [dispatch, navigate]
  )
}

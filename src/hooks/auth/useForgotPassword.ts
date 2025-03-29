import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPasswordThunk } from 'store/profile/thunk'
import { Profile } from 'store/profile/types'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { PUBLIC_PAGES } from 'helpers/constants/pages'
import { isRejectedAction } from 'helpers/functions/store'

export const useForgotPassword = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  return useCallback(
    async ({ email }: Pick<Profile, 'email'>) => {
      const res = await dispatch(forgotPasswordThunk({ email }))
      if (isRejectedAction(res)) return

      navigate(PUBLIC_PAGES.emailVerification)
    },
    [dispatch, navigate]
  )
}

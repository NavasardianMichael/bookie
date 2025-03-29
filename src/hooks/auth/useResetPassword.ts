import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetPasswordThunk } from 'store/profile/thunk'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useQueryParams } from 'hooks/useQueryParams'
import { RESET_PASSWORD_FORM_INITIAL_VALUES } from 'helpers/constants/auth/resetPassword'
import { PUBLIC_PAGES } from 'helpers/constants/pages'
import { isRejectedAction } from 'helpers/functions/store'

export const useResetPassword = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const queryParams = useQueryParams()

  const email = queryParams.email
  const token = queryParams?.token?.replace(/ /gi, '+')

  return useCallback(
    async (values: typeof RESET_PASSWORD_FORM_INITIAL_VALUES) => {
      const res = await dispatch(resetPasswordThunk({ email, token, ...values }))
      if (isRejectedAction(res)) return

      navigate(PUBLIC_PAGES.confirmation)
    },
    [dispatch, navigate, email, token]
  )
}

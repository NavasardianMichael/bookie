import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePasswordThunk } from 'store/profile/thunk'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { CHANGE_PASSWORD_FORM_INITIAL_VALUES } from 'helpers/constants/auth/changePassword'
import { PUBLIC_PAGES } from 'helpers/constants/pages'
import { isRejectedAction } from 'helpers/functions/store'

export const useChangePassword = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  return useCallback(
    async (values: typeof CHANGE_PASSWORD_FORM_INITIAL_VALUES) => {
      const res = await dispatch(changePasswordThunk(values))
      if (isRejectedAction(res)) return

      navigate(PUBLIC_PAGES.confirmation)
    },
    [dispatch, navigate]
  )
}

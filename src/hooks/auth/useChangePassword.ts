import { CHANGE_PASSWORD_FORM_INITIAL_VALUES } from '@constants/auth/changePassword'
import { isRejectedAction } from '@helpers/store'
import { useAppDispatch } from '@hooks/useAppDispatch'
import { changePasswordThunk } from '@store/profile/thunk'
import { useCallback } from 'react'

export const useChangePassword = () => {
  // const router = useRouter()
  const dispatch = useAppDispatch()

  return useCallback(
    async (values: typeof CHANGE_PASSWORD_FORM_INITIAL_VALUES) => {
      const res = await dispatch(changePasswordThunk(values))
      if (isRejectedAction(res)) return

      // router.push(PUBLIC_PAGES.confirmation)
    },
    [dispatch]
  )
}

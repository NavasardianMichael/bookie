import { LoginAPI } from '@api/auth/types'
import { ROUTES } from '@constants/routes'
import { isRejectedAction } from '@helpers/store'
import { useAppDispatch } from '@hooks/useAppDispatch'
import useLocalStorage from '@hooks/useLocalStorage'
import { LoginTypes } from '@interfaces/auth'
import { loginThunk } from '@store/profile/thunk'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export const useLogin = (loginType: LoginTypes) => {
  const dispatch = useAppDispatch()
  const router = useRouter()

  const [, setIsLoggedIn] = useLocalStorage('isLoggedIn', false)

  return useCallback(
    async (values: LoginAPI['payload']) => {
      const loginAction = await dispatch(loginThunk({ loginType, values }))

      if (isRejectedAction(loginAction)) return

      setIsLoggedIn(true)
      router.push(ROUTES.home)
    },
    [dispatch, loginType, setIsLoggedIn]
  )
}

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginAPI } from 'api/auth/types'
import { loginThunk } from 'store/profile/thunk'
import { isRejectedAction } from 'helpers/functions/store'
import { useAppDispatch } from '../useAppDispatch'
import useLocalStorage from '../useLocalStorage'
import { PUBLIC_PAGES } from 'helpers/constants/pages'
import { LoginTypes } from '../../helpers/types/auth'

export const useLogin = (loginType: LoginTypes) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [, setIsLoggedIn] = useLocalStorage('isLoggedIn', false)

  return useCallback(
    async (values: LoginAPI['payload']) => {
      const loginAction = await dispatch(loginThunk({ loginType, values }))

      if (isRejectedAction(loginAction)) return

      setIsLoggedIn(true)
      navigate(PUBLIC_PAGES.home)
    },
    [dispatch, loginType, navigate, setIsLoggedIn]
  )
}

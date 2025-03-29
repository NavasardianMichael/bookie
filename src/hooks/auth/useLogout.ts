import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutThunk } from 'store/profile/thunk'
import { PUBLIC_PAGES } from 'helpers/constants/pages'
import { isRejectedAction } from 'helpers/functions/store'
import { useAppDispatch } from '../useAppDispatch'
import useLocalStorage from '../useLocalStorage'

export const useLogout = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [, , removeIsLoggedInFlag] = useLocalStorage('isLoggedIn', false)

  return useCallback(async () => {
    const res = await dispatch(logoutThunk())
    if (isRejectedAction(res)) return

    removeIsLoggedInFlag()
    navigate(PUBLIC_PAGES.login, {
      state: {
        origin: PUBLIC_PAGES.home,
      },
    })
  }, [dispatch, navigate, removeIsLoggedInFlag])
}

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerThunk } from 'store/profile/thunk'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { REGISTRATION_FORM_INITIAL_VALUES } from 'helpers/constants/auth/registration'
import { PRIVATE_PAGES } from 'helpers/constants/pages'
import { isRejectedAction } from 'helpers/functions/store'

export const useRegister = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  // const queryParams = useQueryParams()

  // const email = queryParams.email
  // const token = queryParams?.token?.replace(/ /gi, '+')
  // const role = +queryParams.role as Role

  return useCallback(
    async (values: typeof REGISTRATION_FORM_INITIAL_VALUES) => {
      const { email, password, rememberMe } = values

      const res = await dispatch(
        registerThunk({
          email,
          password,
          rememberMe,
        })
      )

      if (isRejectedAction(res)) return

      navigate(PRIVATE_PAGES.profile)
    },
    [dispatch, navigate]
  )
}

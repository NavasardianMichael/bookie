import { useCallback } from 'react'
import { verifyTokenThunk } from 'store/profile/thunk'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useQueryParams } from 'hooks/useQueryParams'

export const useVerifyToken = () => {
  const dispatch = useAppDispatch()
  const searchParams = useQueryParams()

  return useCallback(async () => {
    await dispatch(
      verifyTokenThunk({
        email: searchParams.email,
        token: searchParams?.token?.replace(/ /gi, '+'),
        type: searchParams.type,
      })
    )
  }, [dispatch, searchParams.email, searchParams.token, searchParams.type])
}

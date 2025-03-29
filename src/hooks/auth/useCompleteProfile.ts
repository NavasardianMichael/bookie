import { isRejectedAction } from 'helpers/functions/store'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useCallback } from 'react'
import { message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PUBLIC_PAGES } from '../../helpers/constants/pages'
import { PROFILE_FORM_INITIAL_VALUES } from '../../helpers/constants/profile'
import { completeProfileThunk } from '../../store/profile/thunk'

export const useCompleteProfile = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  return useCallback(
    async (values: typeof PROFILE_FORM_INITIAL_VALUES) => {
      const res = await dispatch(completeProfileThunk({
        firstName: values.firstName,
        lastName: values.lastName,
        address: values.address,
        phoneNumber: values.phoneNumber,
        telegram: values.telegram,
        whatsApp: values.whatsApp,
        viber: values.viber,
        countryId: values.countryId,
        regionId: values.regionId,
      }))
      if (isRejectedAction(res)) return
      message.success('Profile completed Successfully!');
      navigate(PUBLIC_PAGES.home)
    },
    [dispatch]
  )
}

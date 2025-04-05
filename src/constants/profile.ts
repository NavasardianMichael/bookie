import { Endpoint } from '@interfaces/api'
import { Profile } from '@store/profile/types'
import { ROLES } from './roles'

export const PROFILE_INITIAL_DATA: Profile = {
  id: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: ROLES.guest,
  image: '',
  email: ''
}

type ProfileForm = {
  firstName: string
  lastName: string
  countryId: string
  regionId: string
  address: string
  phoneNumber: string
  whatsApp: string
  viber: string
}

export type CompleteProfileAPI = Endpoint<{
  payload: ProfileForm
  response: void
  processed: void
}>

export const PROFILE_FORM_INITIAL_VALUES: ProfileForm = {
  firstName: '',
  lastName: '',
  countryId: '',
  regionId: '',
  address: '',
  phoneNumber: '',
  whatsApp: '',
  viber: '',
}

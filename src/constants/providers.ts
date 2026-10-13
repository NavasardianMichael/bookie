import { PROVIDER_PROFILE_INITIAL_STATE } from '@store/providers/profile/store'
import { ProviderProfileFormValues } from '@interfaces/providers'

export const PROVIDER_PROFILE_FORM_INITIAL_VALUES: ProviderProfileFormValues = {
  firstName: '',
  lastName: '',
  address: '',
  locationURL: '',
  description: '',
  image: '',
  organizationId: undefined,
  gallery: [],
  weekSchedule: PROVIDER_PROFILE_INITIAL_STATE.details.weekSchedule,
}

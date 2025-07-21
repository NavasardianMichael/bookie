import { Category } from '@store/categories/single/types'
import { Consumer } from '@store/consumers/profile/types'
import { Organization } from '@store/organizations/single/types'
import { Provider } from '@store/providers/profile/types'
import { Appointment } from '@interfaces/appointments'

export type DBType = {
  categories: Category[]
  consumers: Consumer[]
  providers: Provider[]
  organizations: Organization[]
  appointments: Appointment[]
  getCodeByPhoneNumber: boolean
  validatePhoneNumberCode: boolean
}

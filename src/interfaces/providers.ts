import { Category } from '@store/categories/single/types'
import { Organization } from '@store/organizations/single/types'
import { ProviderProfile } from '@store/providers/profile/types'

export type ProviderProfileFormValues = {
  id?: ProviderProfile['id']
  firstName: ProviderProfile['basic']['firstName']
  lastName: ProviderProfile['basic']['lastName']
  categoryIds: Category['id'][]
  address: ProviderProfile['details']['location']['address']
  locationURL: ProviderProfile['details']['location']['url']
  description?: ProviderProfile['basic']['description']
  image?: ProviderProfile['basic']['image']
  email?: ProviderProfile['details']['email']
  organizationId?: Organization['id']
  gallery?: (ProviderProfile['details']['gallery'][number] | File)[]
}

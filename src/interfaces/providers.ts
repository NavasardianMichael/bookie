import { UploadFile } from 'antd'
import { Category } from '@store/categories/single/types'
import { Organization } from '@store/organizations/single/types'
import { Provider } from '@store/providers/profile/types'

export type ProviderProfileFormValues = {
  id?: Provider['id']
  firstName: Provider['basic']['firstName']
  lastName: Provider['basic']['lastName']
  categoryIds: Category['id'][]
  address: Provider['details']['location']['address']
  locationURL: Provider['details']['location']['url']
  description?: Provider['basic']['description']
  image?: UploadFile
  email?: Provider['details']['email']
  organizationId?: Organization['id']
}

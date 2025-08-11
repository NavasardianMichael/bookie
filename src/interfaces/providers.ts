import { UploadFile } from 'antd'
import { Category } from '@store/categories/single/types'
import { Provider } from '@store/providers/profile/types'

export type ProviderProfileFormValues = {
  firstName: Provider['basic']['firstName']
  lastName: Provider['basic']['lastName']
  categories: Category['id'][]
  address: Provider['details']['location']['address']
  locationURL: Provider['details']['location']['url']
  description?: Provider['basic']['description']
  image?: UploadFile
  email?: Provider['details']['email']
  organization?: Provider['basic']['organization']
}

import { Provider } from '@store/providers/profile/types'

export type ProviderProfileFormValues = {
  firstName: Provider['basic']['firstName']
  lastName: Provider['basic']['lastName']
  categories: Provider['basic']['categories']
  description?: Provider['basic']['description']
  image?: Provider['basic']['image']
  email?: Provider['details']['email']
  organization?: Provider['basic']['organization']
}

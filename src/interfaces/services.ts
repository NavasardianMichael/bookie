import { ProviderService } from '@store/providers/profile/types'

export type ProviderProfileServiceFormValues = Pick<
  ProviderService,
  'name' | 'duration' | 'description' | 'price' | 'currency' | 'image' | 'categoryId'
> & {
  id?: ProviderService['id']
}

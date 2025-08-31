import { ProviderService } from '@store/providers/profile/types'

export type ProviderServiceFormValues = Pick<
  ProviderService,
  'name' | 'duration' | 'description' | 'price' | 'currency' | 'image' | 'categoryId'
> & {
  id?: ProviderService['id']
}

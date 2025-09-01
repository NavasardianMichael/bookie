import { ProviderService } from '@store/providers/profile/types'

// export type ProviderServiceFormValues = Pick<
//   ProviderService,
//   'name' | 'duration' | 'description' | 'price' | 'currency' | 'image' | 'categoryId'
// > & {
//   id?: ProviderService['id']
// }
export type ProviderServiceFormValues = {
  id?: ProviderService['id']
  name: ProviderService['name']
  duration?: ProviderService['duration']
  description?: ProviderService['description']
  price?: ProviderService['price']
  currency?: ProviderService['currency']
  image?: ProviderService['image']
  categoryId?: ProviderService['categoryId']
}

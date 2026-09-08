import { ProviderService } from '@store/providers/profile/types'

/**
 * The service form's Category field. Either a predefined category picked from the
 * combobox (`id` set) or a name typed that does not exist yet, which the server
 * creates on save.
 */
export type CategoryValue = {
  id?: ProviderService['categoryId']
  name: string
}

export type ProviderServiceFormValues = {
  /** Present only for a service that already exists — it is what picks POST vs PUT. */
  id?: ProviderService['id']
  name: ProviderService['name']
  duration?: ProviderService['duration']
  description?: ProviderService['description']
  price?: ProviderService['price']
  currency?: ProviderService['currency']
  /** A `File` between the crop and the save, the stored path once the API has it. */
  image?: ProviderService['image'] | File
  category?: CategoryValue
}

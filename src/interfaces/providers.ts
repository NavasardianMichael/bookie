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
  /**
   * A `File` between the crop and the save, the stored `/uploads/...` path afterwards —
   * the same widening `gallery` below already had. `PutProviderProfileRequestPayload`
   * accepts both and `api/providers/main.ts` switches to multipart when it really is a
   * `File`, so declaring this `string` alone was the type lying about what the field holds.
   */
  image?: ProviderProfile['basic']['image'] | File
  email?: ProviderProfile['details']['email']
  organizationId?: Organization['id']
  gallery?: (ProviderProfile['details']['gallery'][number] | File)[]
  weekSchedule: ProviderProfile['details']['weekSchedule']
}

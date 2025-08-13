import { PostProviderProviderProfileAPI } from '@api/providers/types'
import { ProviderProfileFormValues } from '@interfaces/providers'

export const processProviderProfileFormToPostPayload = (
  formValues: ProviderProfileFormValues
): PostProviderProviderProfileAPI['payload'] => {
  const processedPayload: ReturnType<typeof processProviderProfileFormToPostPayload> = {}
  if (formValues.id) processedPayload.Id = formValues.id
  if (formValues.firstName) processedPayload.LastName = formValues.lastName
  if (formValues.lastName) processedPayload.LastName = formValues.lastName
  if (formValues.categoryIds) processedPayload.CategoryIds = formValues.categoryIds
  if (formValues.address) processedPayload.Address = formValues.address
  if (formValues.locationURL) processedPayload.LocationURL = formValues.locationURL
  if (formValues.description) processedPayload.Description = formValues.description
  if (formValues.email) processedPayload.Email = formValues.email
  if (formValues.image) processedPayload.Image = formValues.image
  if (formValues.organizationId) processedPayload.OrganizationId = formValues.organizationId
  return processedPayload
}

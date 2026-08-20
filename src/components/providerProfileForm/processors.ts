import { PutProviderProfileAPI } from '@api/providers/types'
import { ProviderProfileFormValues } from '@interfaces/providers'

export const processProviderProfileFormToPostPayload = (
  formValues: ProviderProfileFormValues
): PutProviderProfileAPI['payload'] => {
  const processedPayload: Record<string, unknown> = {}

  if (formValues.firstName) processedPayload.firstName = formValues.firstName
  if (formValues.lastName) processedPayload.lastName = formValues.lastName
  if (formValues.categoryIds) processedPayload.categoryIds = JSON.stringify(formValues.categoryIds)
  if (formValues.address) processedPayload.address = formValues.address
  if (formValues.locationURL) processedPayload.locationURL = formValues.locationURL
  if (formValues.description) processedPayload.description = formValues.description
  if (formValues.email) processedPayload.email = formValues.email
  if (formValues.image) processedPayload.image = formValues.image
  if (formValues.gallery) processedPayload.gallery = formValues.gallery
  if (formValues.organizationId) processedPayload.organizationId = formValues.organizationId
  if (formValues.weekSchedule) processedPayload.weekSchedule = JSON.stringify(formValues.weekSchedule)

  return processedPayload as PutProviderProfileAPI['payload']
}

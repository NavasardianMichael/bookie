import { PutProviderServiceAPI } from '@api/providers/types'
import { ProviderServiceFormValues } from '@interfaces/services'

export const processProviderServiceFormToPostPayload = (
  providerId: PutProviderServiceAPI['payload']['providerId'],
  formValues: ProviderServiceFormValues
): PutProviderServiceAPI['payload'] => {
  const processedPayload: PutProviderServiceAPI['payload'] = {
    providerId,
    service: {},
  }

  if (formValues.id) processedPayload.service.id = formValues.id
  if (formValues.name) processedPayload.service.name = formValues.name
  if (formValues.price) processedPayload.service.price = formValues.price
  if (formValues.description) processedPayload.service.description = formValues.description
  if (formValues.image) processedPayload.service.image = formValues.image
  if (formValues.currency) processedPayload.service.currency = formValues.currency
  if (formValues.categoryId) processedPayload.service.categoryId = formValues.categoryId
  if (formValues.duration) processedPayload.service.duration = formValues.duration

  return processedPayload
}

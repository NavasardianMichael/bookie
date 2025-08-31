import { PutProviderServiceAPI } from '@api/providers/types'
import { ProviderServiceFormValues } from '@interfaces/services'

export const processProviderServiceFormToPostPayload = (
  providerId: PutProviderServiceAPI['payload']['providerId'],
  formValues: ProviderServiceFormValues
): PutProviderServiceAPI['payload'] => {
  console.log({ formValues })

  const processedPayload: ReturnType<typeof processProviderServiceFormToPostPayload> = {
    providerId,
    service: {},
  }
  if (formValues.id) processedPayload.service.Id = formValues.id
  if (formValues.name) processedPayload.service.Name = formValues.name
  if (formValues.price) processedPayload.service.Price = formValues.price
  if (formValues.description) processedPayload.service.Description = formValues.description
  if (formValues.image) processedPayload.service.Image = formValues.image
  if (formValues.currency) processedPayload.service.Currency = formValues.currency
  if (formValues.categoryId) processedPayload.service.CategoryId = formValues.categoryId
  if (formValues.duration) processedPayload.service.Duration = formValues.duration
  return processedPayload
}

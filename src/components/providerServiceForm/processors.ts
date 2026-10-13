import { ClearableField, ProviderServiceRequestPayload } from '@api/providers/types'
import { ProviderServiceFormValues } from '@interfaces/services'

/**
 * Empty is sent as `''`, never dropped.
 *
 * The old builder gated every field behind `if (formValues.x)`, so an emptied
 * description, price or currency was simply left out of the payload — and the API reads
 * an absent field as "leave this column alone". Clearing one could never be saved.
 * `null` is folded in here too: antd's `InputNumber` yields it on clear.
 */
const orCleared = <T>(value: T | null | undefined): ClearableField<T> => (value === null || value === undefined ? '' : value)

export const processProviderServiceFormToRequestPayload = (
  formValues: ProviderServiceFormValues
): ProviderServiceRequestPayload => ({
  name: formValues.name,
  duration: formValues.duration,
  description: orCleared(formValues.description),
  price: orCleared(formValues.price),
  currency: orCleared(formValues.currency),
  // Left as-is: the API layer drops it unless it is a freshly cropped `File`.
  image: formValues.image,
})

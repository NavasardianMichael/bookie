import { ClearableField, ProviderServiceRequestPayload } from '@api/providers/types'
import { CategoryValue, ProviderServiceFormValues } from '@interfaces/services'

/**
 * Empty is sent as `''`, never dropped.
 *
 * The old builder gated every field behind `if (formValues.x)`, so an emptied
 * description, price or currency was simply left out of the payload — and the API reads
 * an absent field as "leave this column alone". Clearing one could never be saved.
 * `null` is folded in here too: antd's `InputNumber` yields it on clear.
 */
const orCleared = <T>(value: T | null | undefined): ClearableField<T> => (value === null || value === undefined ? '' : value)

/**
 * Splits the Category combobox value into the two fields the API distinguishes.
 *
 * An `id` means an existing category was picked, so the name is redundant and dropped —
 * sending both would let a stale label rename nothing but confuse the payload. Bare text
 * is sent as `categoryName` for the server to match case-insensitively or create.
 */
export const toCategoryFields = (
  value: CategoryValue | undefined
): Pick<ProviderServiceRequestPayload, 'categoryId' | 'categoryName'> => {
  if (value?.id) return { categoryId: value.id }

  const name = value?.name?.trim()
  return name ? { categoryName: name } : {}
}

export const processProviderServiceFormToRequestPayload = (
  formValues: ProviderServiceFormValues
): ProviderServiceRequestPayload => ({
  name: formValues.name,
  duration: formValues.duration,
  ...toCategoryFields(formValues.category),
  description: orCleared(formValues.description),
  price: orCleared(formValues.price),
  currency: orCleared(formValues.currency),
  // Left as-is: the API layer drops it unless it is a freshly cropped `File`.
  image: formValues.image,
})

import { describe, expect, it } from 'vitest'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import { processProviderProfileFormToPostPayload } from '@components/providerProfileForm/processors'

const FILLED: ProviderProfileFormValues = {
  firstName: 'Anna',
  lastName: 'Petrosyan',
  categoryIds: ['cat-1', 'cat-2'],
  address: '12 Main St',
  locationURL: 'https://maps.example/12-main',
  description: 'Experienced specialist',
  email: 'anna@example.com',
  organizationId: 'org-1',
  image: '/uploads/anna.png',
  gallery: [],
  weekSchedule: PROVIDER_PROFILE_FORM_INITIAL_VALUES.weekSchedule,
}

/**
 * These pin **field-name alignment**, which is where this form's two live bugs came from:
 * the antd `Form.Item name` has to match the key in `ProviderProfileFormValues`, which has
 * to match the key this processor reads. When they drifted, the value was silently dropped
 * on submit with nothing failing — no type error, no validation error, no request error.
 */
describe('processProviderProfileFormToPostPayload', () => {
  // The organization select used to write the antd slot `organization` while this reads
  // `organizationId`, so a picked organization was never submitted.
  it('carries organizationId through', () => {
    expect(processProviderProfileFormToPostPayload(FILLED).organizationId).toBe('org-1')
  })

  it('serialises the two JSON-encoded fields and leaves the rest flat', () => {
    const payload = processProviderProfileFormToPostPayload(FILLED)

    expect(payload.categoryIds).toBe(JSON.stringify(['cat-1', 'cat-2']))
    expect(payload.weekSchedule).toBe(JSON.stringify(FILLED.weekSchedule))
    expect(payload.firstName).toBe('Anna')
    expect(payload.address).toBe('12 Main St')
    expect(payload.locationURL).toBe('https://maps.example/12-main')
  })

  it('every key it emits is a key of the form values', () => {
    const emitted = Object.keys(processProviderProfileFormToPostPayload(FILLED))
    const known = new Set(Object.keys(FILLED))

    expect(emitted.filter((key) => !known.has(key))).toEqual([])
  })

  // `if (formValues.x)` drops empty strings and empty arrays, which is what keeps an
  // untouched optional field out of the request rather than clearing the column.
  it('omits empty optional fields rather than sending blanks', () => {
    const payload = processProviderProfileFormToPostPayload(PROVIDER_PROFILE_FORM_INITIAL_VALUES)

    expect(payload.description).toBeUndefined()
    expect(payload.email).toBeUndefined()
    expect(payload.organizationId).toBeUndefined()
    expect(payload.image).toBeUndefined()
  })

  it('keeps a File on image so the API layer can switch to multipart', () => {
    const file = new File(['x'], 'portrait.png', { type: 'image/png' })
    const payload = processProviderProfileFormToPostPayload({ ...FILLED, image: file })

    expect(payload.image).toBe(file)
  })
})

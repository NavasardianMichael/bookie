import { describe, expect, it } from 'vitest'
import { ProviderServiceFormValues } from '@interfaces/services'
import { processProviderServiceFormToRequestPayload } from '@components/providerServiceForm/processors'

const FILLED: ProviderServiceFormValues = {
  id: 's-1',
  name: 'Haircut',
  duration: 45,
  description: 'A trim',
  price: 30,
  currency: 'usd',
  image: '/uploads/abc.png',
}

describe('processProviderServiceFormToRequestPayload', () => {
  it('carries every filled field through', () => {
    expect(processProviderServiceFormToRequestPayload(FILLED)).toEqual({
      name: 'Haircut',
      duration: 45,
      description: 'A trim',
      price: 30,
      currency: 'usd',
      image: '/uploads/abc.png',
    })
  })

  // `id` picks the endpoint at the call site; it is a path segment, never a body field.
  it('never puts the service id in the body', () => {
    expect(processProviderServiceFormToRequestPayload(FILLED)).not.toHaveProperty('id')
  })

  /**
   * The API reads an absent field as "leave this column alone", so an emptied field has
   * to arrive as `''` to clear it. The old builder gated each one behind `if (value)`
   * and dropped it, which made clearing a description or price unsaveable.
   */
  it('sends an emptied optional field as an empty string rather than dropping it', () => {
    const cleared = processProviderServiceFormToRequestPayload({
      ...FILLED,
      description: undefined,
      price: undefined,
      currency: undefined,
    })

    expect(cleared.description).toBe('')
    expect(cleared.price).toBe('')
    expect(cleared.currency).toBe('')
  })

  // antd's InputNumber yields null on clear, and axios drops null from a multipart body
  // while express.json keeps it — so the same edit would behave differently depending on
  // whether an image happened to come along.
  it('normalises a null price to an empty string', () => {
    const cleared = processProviderServiceFormToRequestPayload({
      ...FILLED,
      price: null as unknown as number,
    })

    expect(cleared.price).toBe('')
  })

  it('keeps a zero price as a number, not as cleared', () => {
    expect(processProviderServiceFormToRequestPayload({ ...FILLED, price: 0 }).price).toBe(0)
  })

  // A service has no category — categories belong to the provider.
  it('sends no category field at all', () => {
    const payload = processProviderServiceFormToRequestPayload({ name: 'Walk-in', duration: 20 })

    expect(payload).toMatchObject({ name: 'Walk-in', duration: 20 })
    expect(payload).not.toHaveProperty('categoryId')
    expect(payload).not.toHaveProperty('categoryName')
  })

  // The API only ever accepts an image as an upload, so the layer below drops a
  // non-File value. The processor passes it along untouched either way.
  it('passes a freshly cropped File through unchanged', () => {
    const file = new File(['x'], 'crop.png', { type: 'image/png' })

    expect(processProviderServiceFormToRequestPayload({ ...FILLED, image: file }).image).toBe(file)
  })
})

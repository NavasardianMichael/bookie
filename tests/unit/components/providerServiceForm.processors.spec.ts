import { describe, expect, it } from 'vitest'
import { ProviderServiceFormValues } from '@interfaces/services'
import {
  processProviderServiceFormToRequestPayload,
  toCategoryFields,
} from '@components/providerServiceForm/processors'

const FILLED: ProviderServiceFormValues = {
  id: 's-1',
  name: 'Haircut',
  duration: 45,
  category: { id: 'cat-1', name: 'Hair' },
  description: 'A trim',
  price: 30,
  currency: 'usd',
  image: '/uploads/abc.png',
}

describe('toCategoryFields', () => {
  it('sends only the id when an existing category was picked', () => {
    expect(toCategoryFields({ id: 'cat-1', name: 'Hair' })).toEqual({ categoryId: 'cat-1' })
  })

  it('sends only the name when the provider typed one that may not exist', () => {
    expect(toCategoryFields({ name: 'Braids' })).toEqual({ categoryName: 'Braids' })
  })

  it('trims the typed name so " Hair " and "Hair" cannot become two categories', () => {
    expect(toCategoryFields({ name: '  Hair  ' })).toEqual({ categoryName: 'Hair' })
  })

  it('sends neither field when the value is absent or blank', () => {
    expect(toCategoryFields(undefined)).toEqual({})
    expect(toCategoryFields({ name: '' })).toEqual({})
    expect(toCategoryFields({ name: '   ' })).toEqual({})
  })

  it('prefers the id over the name when both are present', () => {
    expect(toCategoryFields({ id: 'cat-1', name: 'Renamed Since' })).toEqual({ categoryId: 'cat-1' })
  })
})

describe('processProviderServiceFormToRequestPayload', () => {
  it('carries every filled field through', () => {
    expect(processProviderServiceFormToRequestPayload(FILLED)).toEqual({
      name: 'Haircut',
      duration: 45,
      categoryId: 'cat-1',
      description: 'A trim',
      price: 30,
      currency: 'usd',
      image: '/uploads/abc.png',
    })
  })

  it('sends categoryName instead of categoryId for a typed-in category', () => {
    expect(
      processProviderServiceFormToRequestPayload({ ...FILLED, category: { name: 'Braids' } })
    ).toMatchObject({ categoryName: 'Braids' })
    expect(processProviderServiceFormToRequestPayload({ ...FILLED, category: { name: 'Braids' } })).not.toHaveProperty(
      'categoryId'
    )
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

  // The API only ever accepts an image as an upload, so the layer below drops a
  // non-File value. The processor passes it along untouched either way.
  it('passes a freshly cropped File through unchanged', () => {
    const file = new File(['x'], 'crop.png', { type: 'image/png' })

    expect(processProviderServiceFormToRequestPayload({ ...FILLED, image: file }).image).toBe(file)
  })
})

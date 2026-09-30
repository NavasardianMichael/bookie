import english from '@messages/en.json'
import { describe, expect, it } from 'vitest'
import { SEEDED_CATEGORY_MESSAGE_KEYS, SEEDED_CATEGORY_NAMES } from '@constants/categories'
import { translateCategoryName } from '@helpers/categoryName'

describe('seeded category names', () => {
  it('matches the English catalogue keys so a rename cannot silently undress the UI', () => {
    for (const name of SEEDED_CATEGORY_NAMES) {
      const key = SEEDED_CATEGORY_MESSAGE_KEYS[name]
      expect(english.Categories.names, name).toHaveProperty(key)
    }
  })

  it('translates seeded names and leaves free-text names alone', () => {
    const t = ((key: string) => {
      if (key === 'names.dentistry') return 'Ստոմատոլոգիա'
      throw new Error(`unexpected key ${key}`)
    }) as Parameters<typeof translateCategoryName>[1]

    expect(translateCategoryName('Dentistry', t)).toBe('Ստոմատոլոգիա')
    expect(translateCategoryName('Custom Specialty', t)).toBe('Custom Specialty')
  })
})

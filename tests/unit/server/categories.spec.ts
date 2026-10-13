import { describe, expect, it } from 'vitest'
import { MAX_CHARS_FOR_CATEGORY_NAME, MAX_PROVIDER_CATEGORIES as WEB_MAX_PROVIDER_CATEGORIES } from '@constants/form'
import {
  cleanCategoryName,
  findSameNamedCategory,
  findSimilarCategories,
  isPredefinedCategory,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_SEARCH_RESULTS,
  MAX_PROVIDER_CATEGORIES,
  MAX_SIMILAR_CATEGORIES,
  parseCategoryChoices,
  parseCategorySearchLimit,
  rankCategories,
  uniqueCategories,
} from '../../../server/src/services/categories'

const CATEGORIES = [
  { id: 'gp', name: 'General Practice' },
  { id: 'dent', name: 'Dentistry' },
  { id: 'hair', name: 'Hair care' },
  { id: 'nails', name: 'Nail studio' },
]

/**
 * Categories belong to providers only, and any provider may add one — so what reaches the
 * table, and whether a name is a copy of a row already there, is decided by these.
 */
describe('limits', () => {
  // The form caps the field at the same figures the API refuses beyond; a drift on one side
  // would let the form offer a fourth category the save then rejects.
  it('match the web form', () => {
    expect(MAX_PROVIDER_CATEGORIES).toBe(WEB_MAX_PROVIDER_CATEGORIES)
    expect(MAX_CATEGORY_NAME_LENGTH).toBe(MAX_CHARS_FOR_CATEGORY_NAME)
  })
})

describe('isPredefinedCategory', () => {
  it('knows the six seeded categories, which are never pruned', () => {
    expect(isPredefinedCategory('Dentistry')).toBe(true)
    expect(isPredefinedCategory('Mental Health')).toBe(true)
    expect(isPredefinedCategory('Hair care')).toBe(false)
    expect(isPredefinedCategory('dentistry')).toBe(false)
  })
})

describe('cleanCategoryName', () => {
  it('trims, collapses inner whitespace and caps the length', () => {
    expect(cleanCategoryName('  Hair   care ')).toBe('Hair care')
    expect(cleanCategoryName('x'.repeat(MAX_CATEGORY_NAME_LENGTH + 5))).toHaveLength(MAX_CATEGORY_NAME_LENGTH)
    expect(cleanCategoryName(42)).toBe('')
  })
})

describe('parseCategoryChoices', () => {
  it('reads existing ids and names to add', () => {
    expect(parseCategoryChoices([{ id: ' dent ' }, { name: ' Hair  care ' }])).toEqual([{ id: 'dent' }, { name: 'Hair care' }])
  })

  it('collapses the same id, and the same name however written', () => {
    expect(parseCategoryChoices([{ id: 'dent' }, { id: 'dent' }, { name: 'Hair care' }, { name: 'hair-care' }])).toEqual([
      { id: 'dent' },
      { name: 'Hair care' },
    ])
  })

  it('drops junk and reads anything but an array as none', () => {
    expect(parseCategoryChoices([null, 'Dentistry', {}, { name: '   ' }])).toEqual([])
    expect(parseCategoryChoices('Dentistry')).toEqual([])
    expect(parseCategoryChoices(undefined)).toEqual([])
  })

  // The route refuses more than the cap; silently keeping the first three would hide a bug.
  it('does not cap, so the caller can refuse an oversized list', () => {
    const four = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
    expect(parseCategoryChoices(four)).toHaveLength(4)
  })
})

describe('parseCategorySearchLimit', () => {
  it('accepts 1 to the cap and falls back to the cap', () => {
    expect(parseCategorySearchLimit('5')).toBe(5)
    expect(parseCategorySearchLimit('0')).toBe(MAX_CATEGORY_SEARCH_RESULTS)
    expect(parseCategorySearchLimit('99')).toBe(MAX_CATEGORY_SEARCH_RESULTS)
    expect(parseCategorySearchLimit(undefined)).toBe(MAX_CATEGORY_SEARCH_RESULTS)
  })
})

describe('rankCategories', () => {
  it('finds a predefined category by a translated label', () => {
    expect(rankCategories(CATEGORIES, 'стомат', 5).map((category) => category.id)).toEqual(['dent'])
  })

  it('finds an added category by its own name, with a typo', () => {
    expect(rankCategories(CATEGORIES, 'hiar care', 5).map((category) => category.id)).toEqual(['hair'])
  })

  it('stops at the limit', () => {
    expect(rankCategories(CATEGORIES, 'a', 1)).toHaveLength(1)
  })
})

describe('findSameNamedCategory', () => {
  it('is the same category however it is cased, spaced or punctuated', () => {
    expect(findSameNamedCategory(CATEGORIES, 'hair-care')?.id).toBe('hair')
    expect(findSameNamedCategory(CATEGORIES, '  DENTISTRY ')?.id).toBe('dent')
  })

  // What keeps a provider who types the label they read on screen from minting a copy.
  it('is a predefined category under any of its translated labels', () => {
    expect(findSameNamedCategory(CATEGORIES, 'Стоматология')?.id).toBe('dent')
  })

  it('is nothing for a merely similar name', () => {
    expect(findSameNamedCategory(CATEGORIES, 'Hair cares studio')).toBeUndefined()
  })
})

describe('findSimilarCategories', () => {
  it('offers near misses, the same name first', () => {
    const similar = findSimilarCategories(
      [...CATEGORIES, { id: 'hair-2', name: 'Hair care salon' }],
      'Hair care'
    ).map((category) => category.id)

    expect(similar[0]).toBe('hair')
    expect(similar).toContain('hair-2')
  })

  it('offers at most a dialog-sized handful', () => {
    const many = Array.from({ length: 6 }, (_, index) => ({ id: `n${index}`, name: 'Nail studio' }))
    expect(findSimilarCategories(many, 'Nail studio')).toHaveLength(MAX_SIMILAR_CATEGORIES)
  })
})

describe('uniqueCategories', () => {
  // An organization's categories are its providers'; two providers sharing one list it once.
  it('keeps each id once, in first-seen order', () => {
    expect(uniqueCategories([{ id: 'a' }, { id: 'b' }, { id: 'a' }])).toEqual([{ id: 'a' }, { id: 'b' }])
  })
})

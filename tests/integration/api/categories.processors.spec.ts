import { describe, expect, it } from 'vitest'
import { processCategoriesListResponse, processCategoryResponse } from '@api/categories/processors'
import { Category } from '@store/categories/single/types'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const category = (id: string, name: string): Category =>
  ({ id, name, organizations: [], providers: [] }) as Category

describe('processCategoriesListResponse', () => {
  it('normalizes a list into byId + allIds, preserving order', () => {
    const categories = [category('a', 'Dentistry'), category('b', 'Cardiology')]

    expect(processCategoriesListResponse(envelope(categories) as never)).toEqual({
      allIds: ['a', 'b'],
      byId: { a: categories[0], b: categories[1] },
    })
  })

  it('returns empty structures for an empty list', () => {
    expect(processCategoriesListResponse(envelope([]) as never)).toEqual({ allIds: [], byId: {} })
  })

  it('keeps the last entry when ids repeat, while allIds keeps both', () => {
    const result = processCategoriesListResponse(envelope([category('a', 'First'), category('a', 'Second')]) as never)

    expect(result.allIds).toEqual(['a', 'a'])
    expect(result.byId.a.name).toBe('Second')
  })
})

describe('processCategoryResponse', () => {
  it('unwraps the envelope value', () => {
    const single = category('a', 'Dentistry')
    expect(processCategoryResponse(envelope(single))).toEqual(single)
  })
})

import { describe, expect, it } from 'vitest'
import { processFavoriteProviderIdsResponse, processFavoriteProvidersResponse } from '@api/favorites/processors'
import { BasicProvider } from '@store/providers/list/types'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

const provider = (id: string): BasicProvider =>
  ({ id, basic: { firstName: 'Ada', lastName: 'L', available: true } }) as BasicProvider

describe('processFavoriteProvidersResponse', () => {
  // The page renders newest favourite first, and that order is the API's to decide.
  it('keeps the API order', () => {
    const list = [provider('b'), provider('a'), provider('c')]
    expect(processFavoriteProvidersResponse(envelope(list)).map(({ id }) => id)).toEqual(['b', 'a', 'c'])
  })

  it('reads a null value as an empty list rather than throwing', () => {
    expect(processFavoriteProvidersResponse(envelope(null as unknown as BasicProvider[]))).toEqual([])
  })
})

describe('processFavoriteProviderIdsResponse', () => {
  it('turns the id list into a set-like record every heart can look itself up in', () => {
    expect(processFavoriteProviderIdsResponse(envelope(['a', 'b']))).toEqual({ a: true, b: true })
  })

  it('collapses a duplicate id', () => {
    expect(processFavoriteProviderIdsResponse(envelope(['a', 'a']))).toEqual({ a: true })
  })

  it('answers an empty record for no favourites, and for a null value', () => {
    expect(processFavoriteProviderIdsResponse(envelope([]))).toEqual({})
    expect(processFavoriteProviderIdsResponse(envelope(null as unknown as string[]))).toEqual({})
  })
})

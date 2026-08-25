import { describe, expect, it } from 'vitest'
import { flatToNormalized, normalizedToFlat, omit, pick } from '@helpers/commons'

type Item = { id: string; name: string }

describe('pick', () => {
  it('keeps only the requested keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('omits an absent key rather than setting it undefined', () => {
    const result = pick({ a: 1 } as { a: number; b?: number }, ['a', 'b'])
    expect('b' in result).toBe(false)
  })
})

describe('omit', () => {
  it('drops the requested keys', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 })
  })

  it('returns a copy, leaving the source untouched', () => {
    const source = { a: 1, b: 2 }
    expect(omit(source, ['b'])).toEqual({ a: 1 })
    expect(source).toEqual({ a: 1, b: 2 })
  })
})

describe('flatToNormalized', () => {
  it('builds byId and allIds in input order', () => {
    const items: Item[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]

    expect(flatToNormalized(items)).toEqual({
      allIds: ['a', 'b'],
      byId: { a: items[0], b: items[1] },
    })
  })

  it('skips entries with a falsy id', () => {
    expect(flatToNormalized([{ id: '', name: 'nameless' }] as Item[]).allIds).toEqual([])
  })

  it('returns empty structures for an empty list', () => {
    expect(flatToNormalized([])).toEqual({ allIds: [], byId: {} })
  })
})

describe('normalizedToFlat', () => {
  it('round-trips a well-formed list', () => {
    const items: Item[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]

    expect(normalizedToFlat(flatToNormalized(items))).toEqual(items)
  })

  // Callers must guard. `getProviderLDSchema` does (`.filter(Boolean)`);
  // `useCategoriesList` does not. See docs/BACKLOG.md.
  it('KNOWN BUG: yields undefined for an id with no byId entry', () => {
    const result = normalizedToFlat<Item>({ allIds: ['a', 'ghost'], byId: { a: { id: 'a', name: 'A' } } })

    expect(result).toHaveLength(2)
    expect(result[1]).toBeUndefined()
  })

  // A duplicate id keeps both allIds entries while byId holds only the last write,
  // so the round trip is not lossless.
  it('KNOWN BUG: duplicate ids survive in allIds but collapse in byId', () => {
    const normalized = flatToNormalized<Item>([
      { id: 'a', name: 'first' },
      { id: 'a', name: 'second' },
    ])

    expect(normalized.allIds).toEqual(['a', 'a'])
    expect(normalizedToFlat(normalized)).toEqual([
      { id: 'a', name: 'second' },
      { id: 'a', name: 'second' },
    ])
  })
})

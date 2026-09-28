import { describe, expect, it } from 'vitest'
import * as web from '@helpers/search'
import * as server from '../../../server/src/lib/search'
import { buildSearchVocabulary, correctSearchTerms } from '../../../server/src/lib/searchCorrection'

/**
 * `src/helpers/search.ts` and `server/src/lib/search.ts` are twins — the packages cannot
 * import each other — so every case runs against both. A change to one that is not made to
 * the other fails here rather than as a search that works in the dropdown and not on submit.
 */
describe.each([
  ['web', web],
  ['server', server],
] as const)('search (%s)', (_, search) => {
  it('exports the same functions as its twin', () => {
    expect(Object.keys(search).sort()).toEqual(Object.keys(web).sort())
  })

  describe('normalizeSearchText', () => {
    it('lowercases, strips accents, reads punctuation as a space and collapses whitespace', () => {
      expect(search.normalizeSearchText('  Café—NORD \t Clinic ')).toBe('cafe nord clinic')
      expect(search.normalizeSearchText("O'Brien's")).toBe('obriens')
      expect(search.normalizeSearchText('Ёлка Ärzte')).toBe('елка arzte')
    })
  })

  describe('collapseWhitespace', () => {
    it('trims both ends and collapses inner runs, keeping case', () => {
      expect(search.collapseWhitespace('  Acme \t  Dental ')).toBe('Acme Dental')
    })
  })

  describe('editDistance', () => {
    it('counts a swap of neighbours as one edit', () => {
      expect(search.editDistance('brigth', 'bright', 2)).toBe(1)
      expect(search.editDistance('helth', 'health', 2)).toBe(1)
    })

    it('stops at the cap', () => {
      expect(search.editDistance('abcdef', 'uvwxyz', 1)).toBe(2)
    })
  })

  describe('matchScore', () => {
    const cases: [candidate: string, query: string, score: number][] = [
      ['Acme Dental', 'acme dental', 1],
      ['Acme Dental', 'acmedental', 0.95],
      ['Acme Dental', 'acm', 0.9],
      ['Bright Acme Dental', 'acme', 0.8],
      ['SkinCare Center', 'care', 0.7],
    ]
    it.each(cases)('%s ← %s = %s', (candidate, query, score) => {
      expect(search.matchScore(candidate, query)).toBe(score)
    })

    it('matches words in any order, by prefix or a typo', () => {
      expect(search.matchScore('City Health Clinic', 'clinic city')).toBeCloseTo(0.6)
      expect(search.matchScore('City Health Clinic', 'helth')).toBeCloseTo(0.4)
      expect(search.matchScore('Massage Therapy', 'masage')).toBeGreaterThan(0)
    })

    it('tolerates a typo in a word still being typed', () => {
      expect(search.matchScore('Massage Therapy', 'masa')).toBeGreaterThan(0)
    })

    it('does not stretch a short word into a typo', () => {
      expect(search.matchScore('Acme Dental', 'ab')).toBe(0)
      expect(search.matchScore('Acme Dental', 'orthodontics')).toBe(0)
    })

    it('ranks nothing for an empty query', () => {
      expect(search.matchScore('Acme', '   ')).toBe(0)
    })
  })

  describe('matchesSearch', () => {
    it('keeps everything for an empty query, as a filter should', () => {
      expect(search.matchesSearch('Acme', '')).toBe(true)
      expect(search.matchesSearch('Acme', 'zzz')).toBe(false)
    })
  })

  describe('rankBySearch', () => {
    it('puts the best match first and keeps input order between equals', () => {
      const names = ['Dental Care', 'Acme Dental', 'Dent Studio', 'Dental Arts']
      expect(search.rankBySearch(names, (name) => name, 'dental')).toEqual(['Dental Care', 'Dental Arts', 'Acme Dental', 'Dent Studio'])
    })
  })

  describe('isSameName', () => {
    it('ignores case, accents, punctuation, spacing and word order', () => {
      expect(search.isSameName('Acme Dental', '  acme-DENTAL ')).toBe(true)
      expect(search.isSameName('Acme Dental', 'AcmeDental')).toBe(true)
      expect(search.isSameName('Acme Dental', 'Dental Acme')).toBe(true)
      expect(search.isSameName('Café Nord', 'cafe nord')).toBe(true)
    })

    it('does not call a near miss the same name', () => {
      expect(search.isSameName('Acme Dental', 'Acme Dentals')).toBe(false)
      expect(search.isSameName('Acme', '')).toBe(false)
    })
  })

  describe('isSimilarName', () => {
    it('catches a typo or two, and one word more', () => {
      expect(search.isSimilarName('Acme Dental', 'Acme Dentl')).toBe(true)
      expect(search.isSimilarName('Bright Smile', 'Brigth Smile')).toBe(true)
      expect(search.isSimilarName('Acme Dental', 'Acme Dental Clinic')).toBe(true)
    })

    it('leaves different names apart', () => {
      expect(search.isSimilarName('Acme Dental', 'Apex Medical')).toBe(false)
      expect(search.isSimilarName('Acme', 'Acme Dental')).toBe(false)
      expect(search.isSimilarName('City Clinic', 'City Health Clinic North')).toBe(false)
    })
  })
})

describe('correctSearchTerms', () => {
  const vocabulary = buildSearchVocabulary([
    'Anna Petrosyan',
    'Ani Danielyan',
    'José Martínez',
    'Deep tissue massage',
    'Stress management',
    null,
  ])

  it('widens a misspelled word to the closest known spellings, keeping the word itself', () => {
    expect(correctSearchTerms(['masage'], vocabulary)).toEqual([['masage', 'massage']])
    expect(correctSearchTerms(['anna', 'petrosian'], vocabulary)).toEqual([['anna'], ['petrosian', 'petrosyan']])
  })

  it('offers every equally close spelling, since only the rows can say which was meant', () => {
    // "ana" sits inside "management", which is why the first query matched nothing useful.
    expect(correctSearchTerms(['ana', 'petrosian'], vocabulary)).toEqual([
      ['ana', 'anna', 'ani'],
      ['petrosian', 'petrosyan'],
    ])
  })

  it('gives an unaccented word its stored accents, since ILIKE compares against those', () => {
    expect(correctSearchTerms(['jose'], vocabulary)).toEqual([['jose', 'josé']])
    expect(correctSearchTerms(['martin'], vocabulary)).toEqual([['martin', 'martínez']])
  })

  it('returns null when nothing would change, so the query is not repeated', () => {
    expect(correctSearchTerms(['anna'], vocabulary)).toBeNull()
    expect(correctSearchTerms(['zzzzzz'], vocabulary)).toBeNull()
  })
})

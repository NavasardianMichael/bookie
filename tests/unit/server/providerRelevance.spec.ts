import { describe, expect, it } from 'vitest'
import {
  matchedServicesByProvider,
  pickMatchedService,
  rankByRelevance,
  RELEVANCE_RANK_LIMIT,
  type RelevanceCandidate,
  shouldRankByRelevance,
  termQuality,
} from '../../../server/src/services/providerRelevance'

const candidate = (id: string, overrides: Partial<RelevanceCandidate> = {}): RelevanceCandidate => ({
  id,
  firstName: 'Lilit',
  lastName: 'Sargsyan',
  available: true,
  ratingScore: 4,
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  organization: null,
  services: [],
  categories: [],
  ...overrides,
})

const ids = (candidates: RelevanceCandidate[]): string[] => candidates.map((entry) => entry.id)

describe('termQuality', () => {
  it('ranks the whole field over a whole word over the start of a word over the inside of one', () => {
    expect(termQuality('massage', 'massage')).toBe(4)
    expect(termQuality('thai massage', 'massage')).toBe(3)
    expect(termQuality('massagetti', 'massage')).toBe(2)
    expect(termQuality('stonemassage', 'massage')).toBe(1)
    expect(termQuality('sargsyan', 'massage')).toBe(0)
  })

  it('reads a term of several words as one phrase', () => {
    expect(termQuality('mens hair cut', 'hair cut')).toBe(3)
    expect(termQuality('mens hair cutting', 'hair cut')).toBe(2)
  })
})

/**
 * Explore used to order a search by rating alone, so a provider who offers exactly what
 * was typed could sit below one whose surname merely starts with it.
 */
describe('rankByRelevance', () => {
  it('puts a whole-word match above a word-start one above an inside-a-word one', () => {
    const ranked = rankByRelevance(
      [
        candidate('inside', { services: [{ name: 'Stonemassage' }] }),
        candidate('start', { lastName: 'Massagetti' }),
        candidate('whole', { services: [{ name: 'Thai massage' }] }),
      ],
      [['massage']]
    )

    expect(ids(ranked)).toEqual(['whole', 'start', 'inside'])
  })

  it('prefers a service to a name matched equally well', () => {
    const ranked = rankByRelevance(
      [candidate('name', { lastName: 'Laser' }), candidate('service', { services: [{ name: 'Laser' }] })],
      [['laser']]
    )

    expect(ids(ranked)).toEqual(['service', 'name'])
  })

  it('never lets a service matched worse outrank a name matched better', () => {
    const ranked = rankByRelevance(
      [candidate('service', { services: [{ name: 'Laserhair removal' }] }), candidate('name', { lastName: 'Laser' })],
      [['laser']]
    )

    expect(ids(ranked)).toEqual(['name', 'service'])
  })

  it('reads a seeded category in every language', () => {
    const ranked = rankByRelevance(
      [
        candidate('organization', { organization: { name: 'Мегастоматология' } }),
        candidate('category', { categories: [{ category: { name: 'Dentistry' } }] }),
      ],
      [['стоматология']]
    )

    expect(ids(ranked)).toEqual(['category', 'organization'])
  })

  it('keeps bookable providers first, as recommended does without a query', () => {
    const ranked = rankByRelevance(
      [
        candidate('paused', { available: false, services: [{ name: 'Massage' }] }),
        candidate('open', { services: [{ name: 'Stonemassage' }] }),
      ],
      [['massage']]
    )

    expect(ids(ranked)).toEqual(['open', 'paused'])
  })

  it('breaks an equal match on rating, then on the freshest edit', () => {
    const service = [{ name: 'Massage' }]
    const ranked = rankByRelevance(
      [
        candidate('older', { services: service, updatedAt: new Date('2026-01-01T00:00:00.000Z') }),
        candidate('rated', { services: service, ratingScore: 4.8 }),
        candidate('newer', { services: service }),
      ],
      [['massage']]
    )

    expect(ids(ranked)).toEqual(['rated', 'newer', 'older'])
  })

  it('sums the words, and takes the best of each word’s spellings', () => {
    const ranked = rankByRelevance(
      [
        candidate('one-word', { firstName: 'Anna', services: [{ name: 'Stonemassage' }] }),
        candidate('both-words', { firstName: 'Anna', services: [{ name: 'Massage' }] }),
      ],
      [['anna'], ['masage', 'massage']]
    )

    expect(ids(ranked)).toEqual(['both-words', 'one-word'])
  })

  it('keeps a row the database matched even when nothing here looks like the term', () => {
    expect(ids(rankByRelevance([candidate('kept')], [['zzz']]))).toEqual(['kept'])
  })
})

describe('shouldRankByRelevance', () => {
  const query = { terms: ['massage'], sort: 'recommended' as const }

  it('ranks only a typed query under the default sort', () => {
    expect(shouldRankByRelevance(query, 12)).toBe(true)
    expect(shouldRankByRelevance({ ...query, terms: [] }, 12)).toBe(false)
    expect(shouldRankByRelevance({ ...query, sort: 'topRated' }, 12)).toBe(false)
  })

  it('skips the work when there is nothing to order or too much to load', () => {
    expect(shouldRankByRelevance(query, 1)).toBe(false)
    expect(shouldRankByRelevance(query, RELEVANCE_RANK_LIMIT)).toBe(true)
    expect(shouldRankByRelevance(query, RELEVANCE_RANK_LIMIT + 1)).toBe(false)
  })
})

describe('pickMatchedService', () => {
  const dentistry = { name: 'Dentistry' }

  it('names the exact service over one that only contains the word', () => {
    const services = [
      { name: 'Sports massage', category: null },
      { name: 'Massage', category: null },
    ]

    expect(pickMatchedService(services, [['massage']])?.name).toBe('Massage')
  })

  it('names the service whose name matches best', () => {
    const services = [
      { name: 'Follow-up visit', category: dentistry },
      { name: 'Initial consultation', category: dentistry },
    ]

    expect(pickMatchedService(services, [['consultation']])?.name).toBe('Initial consultation')
  })

  it('prefers any name match to a match through the category', () => {
    const services = [
      { name: 'Cleaning', category: dentistry },
      { name: 'Dentistry check', category: null },
    ]

    expect(pickMatchedService(services, [['dentistry']])?.name).toBe('Dentistry check')
  })

  it('falls back to a service in the matched category, in the order given', () => {
    const services = [
      { name: 'Follow-up visit', category: dentistry },
      { name: 'Initial consultation', category: dentistry },
    ]

    expect(pickMatchedService(services, [['стоматология']])?.name).toBe('Follow-up visit')
  })

  // A provider found only by name has no service that `matchedServicesWhere` lets through.
  it('names nothing when no service matched', () => {
    expect(pickMatchedService([], [['anna']])).toBeUndefined()
  })
})

describe('matchedServicesByProvider', () => {
  it('names one service per provider and counts the rest', () => {
    const matches = matchedServicesByProvider(
      [
        { providerId: 'a', name: 'Sports massage', category: null },
        { providerId: 'b', name: 'Massage', category: null },
        { providerId: 'a', name: 'Massage', category: null },
        { providerId: 'a', name: 'Stonemassage', category: null },
      ],
      [['massage']]
    )

    expect(matches.get('a')).toEqual({ service: { providerId: 'a', name: 'Massage', category: null }, more: 2 })
    expect(matches.get('b')?.more).toBe(0)
    expect(matches.has('c')).toBe(false)
  })
})

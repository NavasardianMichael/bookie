import { describe, expect, it } from 'vitest'
import { type ProviderSeoInput, seoFingerprint } from '../../../server/src/services/providerSeoFingerprint'

/**
 * The fingerprint decides when a provider page's sitemap `lastmod` and `dateModified` move:
 * it must change with anything search engines see, and with nothing else.
 */
const input = (overrides: Partial<ProviderSeoInput> = {}): ProviderSeoInput => ({
  fullName: 'Anna Petrosyan',
  description: 'Gentle dentistry.',
  imageUrl: '/uploads/anna.jpg',
  address: '12 Abovyan St',
  locationUrl: null,
  country: 'AM',
  phoneVisible: true,
  weekSchedule: { monday: { availability: { start: '09:00', end: '17:00' }, breaks: [] } },
  timeZone: 'Asia/Yerevan',
  listed: true,
  available: true,
  seoTitle: null,
  seoDescription: null,
  slug: 'anna',
  organizationName: 'Smile Clinic',
  categoryNames: ['Dentist', 'Orthodontist'],
  services: [
    { name: 'Cleaning', description: null, durationMinutes: 30, price: '20', currency: 'USD', availability: null },
    { name: 'Whitening', description: null, durationMinutes: 60, price: '50', currency: 'USD', availability: null },
  ],
  ratingAvg: 4.5,
  ratingCount: 2,
  ...overrides,
})

describe('seoFingerprint', () => {
  it('is stable for the same inputs', () => {
    expect(seoFingerprint(input())).toBe(seoFingerprint(input()))
  })

  // Rows come back in no fixed order; reordering is not a change to the page.
  it('ignores the order of categories, services and JSON keys', () => {
    const base = input()
    expect(
      seoFingerprint({
        ...base,
        categoryNames: [...base.categoryNames].reverse(),
        services: [...base.services].reverse(),
        weekSchedule: { monday: { breaks: [], availability: { end: '17:00', start: '09:00' } } },
      })
    ).toBe(seoFingerprint(base))
  })

  it.each<[string, Partial<ProviderSeoInput>]>([
    ['the name', { fullName: 'Anna P.' }],
    ['the address', { address: '1 Main St' }],
    ['the country', { country: 'GE' }],
    ['a category', { categoryNames: ['Dentist'] }],
    ['the organization', { organizationName: null }],
    ['an SEO override', { seoDescription: 'Best dentist in Yerevan' }],
    ['the slug', { slug: 'anna-dentist' }],
    ['the hours', { weekSchedule: {} }],
    ['the rating', { ratingCount: 3 }],
    ['the listing', { listed: false }],
    [
      'a service name',
      {
        services: [
          { name: 'Deep cleaning', description: null, durationMinutes: 30, price: '20', currency: 'USD', availability: null },
        ],
      },
    ],
  ])('changes with %s', (_, overrides) => {
    expect(seoFingerprint(input(overrides))).not.toBe(seoFingerprint(input()))
  })
})

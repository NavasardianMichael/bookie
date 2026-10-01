import { describe, expect, it } from 'vitest'
// Relative, not aliased: `server/` is a separate package. `entities.ts` imports only
// Prisma types and two pure services, which is what keeps it reachable here.
import { mapProviderPlan, mapSingleProvider, resolveOnlineBooking } from '../../../server/src/mappers/entities'
import { PLAN_CATALOGUE } from '../../../server/src/services/plans'

type ProviderRow = Parameters<typeof mapSingleProvider>[0]

/** The columns the public mapper reads, and a few private ones it must not publish. */
const providerRow = (overrides: Partial<ProviderRow> = {}): ProviderRow =>
  ({
    id: '6f1c2f3e-8d4b-4a8e-9b0c-1d2e3f4a5b6c',
    firstName: 'Anna',
    lastName: 'Petrosyan',
    description: null,
    imageUrl: null,
    categories: [],
    organization: null,
    services: [],
    gallery: [],
    user: { email: 'anna@example.com' },
    available: true,
    weekSchedule: null,
    ratingAvg: 0,
    ratingCount: 0,
    address: 'Yerevan',
    locationUrl: '',
    phoneCode: 374,
    phoneNumber: BigInt(10222333),
    phoneVisible: true,
    country: 'AM',
    paymentInfo: null,
    requiresBookingApproval: false,
    seoTitle: null,
    seoDescription: null,
    slug: null,
    plan: 'premium',
    ...overrides,
  }) as unknown as ProviderRow

describe('resolveOnlineBooking', () => {
  it('is open for an available provider with allowance left', () => {
    expect(resolveOnlineBooking({ available: true })).toBe('open')
  })

  it('is full once the monthly allowance is spent', () => {
    expect(resolveOnlineBooking({ available: true }, true)).toBe('full')
  })

  // The provider's own switch explains more than an allowance does.
  it('is paused whenever the provider switched booking off, full or not', () => {
    expect(resolveOnlineBooking({ available: false })).toBe('paused')
    expect(resolveOnlineBooking({ available: false }, true)).toBe('paused')
  })
})

describe('mapSingleProvider', () => {
  it('publishes whether the page takes bookings', () => {
    expect(mapSingleProvider(providerRow()).details.onlineBooking).toBe('open')
    expect(mapSingleProvider(providerRow({ available: false })).details.onlineBooking).toBe('paused')
    expect(mapSingleProvider(providerRow(), { bookingsFull: true }).details.onlineBooking).toBe('full')
  })

  // The public payload is read by anyone. A visitor learns that booking is closed, never
  // which plan the provider is on — that is between the provider and us.
  it('never carries the plan', () => {
    const json = JSON.stringify(mapSingleProvider(providerRow()), (_key, value: unknown) =>
      typeof value === 'bigint' ? Number(value) : value
    )
    expect(json).not.toMatch(/"plan"|premium|"personal"|entitlements|planExpiresAt/)
  })
})

describe('mapProviderPlan', () => {
  const NOW = new Date('2026-09-30T12:00:00.000Z')

  it('gives the owner their effective plan and its limits', () => {
    const mapped = mapProviderPlan({ plan: 'basic', planExpiresAt: new Date('2026-12-01T00:00:00.000Z') }, NOW)
    expect(mapped).toEqual({
      plan: 'basic',
      effectivePlan: 'basic',
      planExpiresAt: '2026-12-01T00:00:00.000Z',
      entitlements: PLAN_CATALOGUE.basic,
    })
  })

  // A lapsed plan still says what it was, so the Plan tab can say "ended", but the limits
  // are already Free's.
  it('applies free limits once the plan has lapsed', () => {
    const mapped = mapProviderPlan({ plan: 'premium', planExpiresAt: new Date('2026-09-01T00:00:00.000Z') }, NOW)
    expect(mapped.plan).toBe('premium')
    expect(mapped.effectivePlan).toBe('free')
    expect(mapped.entitlements).toBe(PLAN_CATALOGUE.free)
  })
})

import { describe, expect, it } from 'vitest'
import { TIME_FORMATS } from '@constants/schedule'
// Relative, not aliased: `server/` is a separate package. `entities.ts` imports only
// Prisma types and pure services, which is what keeps it reachable here.
import {
  mapBasicOrganization,
  mapProviderBooking,
  mapProviderPlan,
  mapReview,
  mapService,
  mapSingleProvider,
  resolveOnlineBooking,
} from '../../../server/src/mappers/entities'
import { PLAN_CATALOGUE } from '../../../server/src/services/plans'

type ProviderRow = Parameters<typeof mapSingleProvider>[0]

/** The columns the public mapper reads, and a few private ones it must not publish. */
const providerRow = (overrides: Partial<ProviderRow> = {}): ProviderRow =>
  ({
    id: '6f1c2f3e-8d4b-4a8e-9b0c-1d2e3f4a5b6c',
    fullName: 'Anna Petrosyan',
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
    seoUpdatedAt: new Date('2026-10-20T08:00:00.000Z'),
    createdAt: new Date('2026-01-05T08:00:00.000Z'),
    plan: 'premium',
    addons: [],
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
  it('publishes the name as the one field the provider wrote', () => {
    expect(mapSingleProvider(providerRow()).basic.fullName).toBe('Anna Petrosyan')
  })

  it('publishes whether the page takes bookings', () => {
    expect(mapSingleProvider(providerRow()).details.onlineBooking).toBe('open')
    expect(mapSingleProvider(providerRow({ available: false })).details.onlineBooking).toBe('paused')
    expect(mapSingleProvider(providerRow(), { bookingsFull: true }).details.onlineBooking).toBe('full')
  })

  // The booking grid and the hours list format with it, so it is public like `timeZone`.
  it("publishes the provider's clock, and leaves it out until they choose one", () => {
    expect(mapSingleProvider(providerRow({ timeFormat: TIME_FORMATS.h24 })).details.timeFormat).toBe(TIME_FORMATS.h24)
    expect(mapSingleProvider(providerRow({ timeFormat: null })).details.timeFormat).toBeUndefined()
  })

  it('shows the visitor clock choices unless the provider turned them off', () => {
    expect(mapSingleProvider(providerRow()).details.showClockChoices).toBe(true)
    expect(mapSingleProvider(providerRow({ showClockChoices: false })).details.showClockChoices).toBe(false)
  })

  // The public payload is read by anyone. A visitor learns that booking is closed, never
  // which plan the provider is on — that is between the provider and us.
  it('never carries the plan', () => {
    const json = JSON.stringify(mapSingleProvider(providerRow()), (_key, value: unknown) =>
      typeof value === 'bigint' ? Number(value) : value
    )
    expect(json).not.toMatch(/"plan"|premium|"personal"|entitlements|planExpiresAt/)
  })

  // Branding is an entitlement an add-on can grant; the page learns only the outcome.
  it('drops the branding line for a Free provider holding the add-on, without saying why', () => {
    const row = providerRow({
      plan: 'free',
      addons: [{ addon: 'removeBranding', source: 'paddle', quantity: 1, expiresAt: null }],
    })
    const mapped = mapSingleProvider(row)
    expect(mapped.details.showPoweredBy).toBe(false)
    expect(JSON.stringify(mapped, (_key, value: unknown) => (typeof value === 'bigint' ? Number(value) : value))).not.toMatch(
      /addons|removeBranding|paddle/
    )
  })

  it('keeps the branding line on Free without it', () => {
    expect(mapSingleProvider(providerRow({ plan: 'free' })).details.showPoweredBy).toBe(true)
  })
})

describe('mapProviderBooking', () => {
  type BookingRow = Parameters<typeof mapProviderBooking>[0]

  const bookingRow = (overrides: Partial<BookingRow> = {}): BookingRow => ({
    id: 'booking-1',
    startAt: new Date('2026-10-05T06:00:00.000Z'),
    endAt: new Date('2026-10-05T07:00:00.000Z'),
    durationMinutes: 60,
    status: 'confirmed',
    notes: null,
    paymentMethods: [],
    price: null,
    currency: null,
    createdAt: new Date('2026-10-01T06:00:00.000Z'),
    serviceId: 'service-1',
    service: { id: 'service-1', name: 'Cut' },
    consumerId: null,
    consumer: null,
    guestFullName: null,
    guestPhoneCode: null,
    guestPhoneNumber: null,
    guestEmail: null,
    ...overrides,
  })

  it('names a signed-in booker by their consumer profile', () => {
    const booker = mapProviderBooking(
      bookingRow({
        consumerId: 'consumer-1',
        consumer: {
          id: 'consumer-1',
          fullName: 'Gor Hakobyan',
          phoneCode: 374,
          phoneNumber: BigInt(77000201),
          user: { email: 'gor@example.com' },
        },
      })
    ).booker
    expect(booker).toEqual({
      kind: 'consumer',
      id: 'consumer-1',
      fullName: 'Gor Hakobyan',
      email: 'gor@example.com',
      phone: { code: 374, number: 77000201 },
    })
  })

  it('names a guest by the name they typed at booking time', () => {
    const booker = mapProviderBooking(
      bookingRow({ guestFullName: 'Lilit Sargsyan', guestPhoneCode: 374, guestPhoneNumber: BigInt(77000202) })
    ).booker
    expect(booker).toMatchObject({ kind: 'guest', fullName: 'Lilit Sargsyan', phone: { code: 374, number: 77000202 } })
  })
})

describe('mapReview', () => {
  // "Consumers are never public": the review carries the first word and an initial only.
  it('attributes the review without publishing the surname', () => {
    const review = {
      id: 'review-1',
      rating: 5,
      comment: null,
      providerReply: null,
      providerRepliedAt: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      consumerId: 'consumer-1',
      consumer: { fullName: 'Anna Maria Petrosyan' },
    } as unknown as Parameters<typeof mapReview>[0]
    expect(mapReview(review).author).toBe('Anna P.')
  })
})

describe('mapProviderPlan', () => {
  const NOW = new Date('2026-09-30T12:00:00.000Z')

  it('gives the owner their effective plan and its limits', () => {
    const mapped = mapProviderPlan({ plan: 'basic', planExpiresAt: new Date('2026-12-01T00:00:00.000Z'), addons: [] }, NOW)
    expect(mapped).toEqual({
      plan: 'basic',
      effectivePlan: 'basic',
      planExpiresAt: '2026-12-01T00:00:00.000Z',
      entitlements: PLAN_CATALOGUE.basic,
      addons: [],
    })
  })

  // A lapsed plan still says what it was, so the Plan tab can say "ended", but the limits
  // are already Free's.
  it('applies free limits once the plan has lapsed', () => {
    const mapped = mapProviderPlan({ plan: 'premium', planExpiresAt: new Date('2026-09-01T00:00:00.000Z'), addons: [] }, NOW)
    expect(mapped.plan).toBe('premium')
    expect(mapped.effectivePlan).toBe('free')
    expect(mapped.entitlements).toBe(PLAN_CATALOGUE.free)
  })

  it('lists the live add-ons, and folds them into the limits', () => {
    const mapped = mapProviderPlan(
      {
        plan: 'free',
        planExpiresAt: null,
        addons: [
          { addon: 'customSlug', source: 'paddle', quantity: 1, expiresAt: new Date('2026-10-04T00:00:00.000Z') },
          { addon: 'extraServices', source: 'admin', quantity: 2, expiresAt: null },
          // Lapsed: neither listed nor granted.
          { addon: 'calendarFeed', source: 'admin', quantity: 1, expiresAt: new Date('2026-09-01T00:00:00.000Z') },
        ],
      },
      NOW
    )
    expect(mapped.addons).toEqual([
      { addon: 'customSlug', quantity: 1, source: 'paddle', expiresAt: '2026-10-04T00:00:00.000Z' },
      { addon: 'extraServices', quantity: 2, source: 'admin', expiresAt: undefined },
    ])
    expect(mapped.entitlements).toMatchObject({ customSlug: true, calendarFeed: false, maxActiveServices: 13 })
  })
})

describe('mapBasicOrganization', () => {
  const organization = {
    id: 'org-1',
    name: 'City Health Clinic',
    description: '',
    phone: '',
    country: 'AM',
    address: '',
    locationUrl: '',
    website: '',
    logoUrl: '',
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
  const dentistry = { id: 'dent', name: 'Dentistry' }
  const general = { id: 'gp', name: 'General Practice' }

  // An organization holds no categories of its own — they are its listed providers'.
  it("lists its providers' categories, each once", () => {
    const mapped = mapBasicOrganization({
      ...organization,
      providers: [
        { categories: [{ category: dentistry }] },
        { categories: [{ category: general }, { category: dentistry }] },
      ],
    })

    expect(mapped.basic.categories).toEqual([dentistry, general])
  })

  it('has none when the read did not include its providers', () => {
    expect(mapBasicOrganization(organization).basic.categories).toEqual([])
  })
})

describe('mapService', () => {
  type ServiceRow = Parameters<typeof mapService>[0]
  const serviceRow = (availability: unknown): ServiceRow =>
    ({
      id: 's-1',
      providerId: 'p-1',
      name: 'Haircut',
      durationMinutes: 30,
      description: null,
      price: null,
      currency: null,
      imageUrl: null,
      active: true,
      availability,
    }) as ServiceRow

  // NULL is the column's meaning for every service written before the rule existed.
  it('answers always for a service with no rule', () => {
    expect(mapService(serviceRow(null)).availability).toEqual({ mode: 'always' })
  })

  it('carries a stored rule through', () => {
    expect(mapService(serviceRow({ mode: 'monthDays', days: [1, 16] })).availability).toEqual({
      mode: 'monthDays',
      days: [1, 16],
    })
  })
})

/**
 * The public page lives at `/p/<slug ?? id>` and states when it last changed, so the payload
 * carries the slug on every list item and the change stamp on the detail.
 */
describe('provider page keys and dates', () => {
  it('carries the slug on the detail payload and on list items, undefined when unset', () => {
    expect(mapSingleProvider(providerRow({ slug: 'acme-hair' })).slug).toBe('acme-hair')
    expect(mapSingleProvider(providerRow()).slug).toBeUndefined()
  })

  it('publishes the SEO change stamp and the creation date, not the row updatedAt', () => {
    const mapped = mapSingleProvider(providerRow())
    expect(mapped.seo.updatedAt).toBe('2026-10-20T08:00:00.000Z')
    expect(mapped.createdAt).toBe('2026-01-05T08:00:00.000Z')
  })
})

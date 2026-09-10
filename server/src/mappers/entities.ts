import type { Prisma } from '@prisma/client'
import type { Category, Organization, Provider, Service } from '@prisma/client'

type ProviderWithRelations = Provider & {
  categories: { category: Category }[]
  organization: Organization | null
  services?: Service[]
  gallery?: { name: string; url: string }[]
}

const defaultWeekSchedule = {
  monday: { availability: { start: '', end: '' }, breaks: [] },
  tuesday: { availability: { start: '', end: '' }, breaks: [] },
  wednesday: { availability: { start: '', end: '' }, breaks: [] },
  thursday: { availability: { start: '', end: '' }, breaks: [] },
  friday: { availability: { start: '', end: '' }, breaks: [] },
  saturday: { availability: { start: '', end: '' }, breaks: [] },
  sunday: { availability: { start: '', end: '' }, breaks: [] },
}

export function mapBasicCategory(category: Category) {
  return { id: category.id, name: category.name }
}

export function mapBasicOrganization(org: Organization & { categories?: { category: Category }[] }) {
  return {
    id: org.id,
    basic: {
      name: org.name,
      categories: org.categories?.map((c) => mapBasicCategory(c.category)) ?? [],
      description: org.description,
    },
  }
}

export function mapOrganization(org: Organization & { categories: { category: Category }[] }) {
  return {
    id: org.id,
    basic: {
      name: org.name,
      categories: org.categories.map((c) => mapBasicCategory(c.category)),
      description: org.description,
    },
    details: {
      phone: org.phone,
      country: org.country,
      location: { address: org.address, url: org.locationUrl },
      email: org.email,
      website: org.website,
      logoUrl: org.logoUrl,
    },
  }
}

export function mapBasicProvider(provider: ProviderWithRelations) {
  return {
    id: provider.id,
    basic: {
      firstName: provider.firstName,
      lastName: provider.lastName,
      description: provider.description ?? undefined,
      image: provider.imageUrl ?? undefined,
      categories: provider.categories.map((c) => mapBasicCategory(c.category)),
      organization: provider.organization ? mapBasicOrganization(provider.organization) : undefined,
      available: provider.available,
    },
  }
}

/**
 * The **public** half of a provider's detail payload.
 *
 * `publicEmail` is a freely-editable contact address, deliberately *not* the identity
 * `User.email`. Keeping them apart is the point: this payload feeds `GET /providers/:id`
 * and the JSON-LD, so emitting the identity email would publish the username half of every
 * provider's credentials into search-indexable structured data. The identity email is
 * emitted only by `mapProviderProfile`, for the owner.
 */
export function mapProviderDetails(provider: ProviderWithRelations & { paymentInfo?: unknown }) {
  const weekSchedule =
    provider.weekSchedule && typeof provider.weekSchedule === 'object'
      ? provider.weekSchedule
      : defaultWeekSchedule

  return {
    location: {
      address: provider.address,
      url: provider.locationUrl,
    },
    // Straight off the Provider row: both columns are NOT NULL, so there is no fallback to
    // invent. This used to be a `{ code: 0, number: 0 }` placeholder that
    // `mapSingleProvider` overwrote from a `user` join with a hardcoded `374` default.
    phone: {
      code: provider.phoneCode,
      number: Number(provider.phoneNumber),
    },
    country: provider.country ?? undefined,
    publicEmail: provider.publicEmail ?? undefined,
    gallery: provider.gallery?.map((g) => ({ name: g.name, url: g.url })) ?? [],
    weekSchedule,
    paymentInfo: provider.paymentInfo ?? undefined,
  }
}

export function mapSingleProvider(provider: ProviderWithRelations) {
  const details = mapProviderDetails(provider)

  const services = provider.services ?? []
  const normalized = services.reduce(
    (acc, s) => {
      acc.allIds.push(s.id)
      acc.byId[s.id] = mapService(s)
      return acc
    },
    { allIds: [] as string[], byId: {} as Record<string, ReturnType<typeof mapService>> }
  )

  return {
    id: provider.id,
    basic: mapBasicProvider(provider).basic,
    details,
    services: normalized,
    seo: mapProviderSeo(provider),
  }
}

/**
 * The owner's search-metadata overrides, on the **public** payload because that is
 * where they are consumed: `generateMetadata` reads them through `getSingleProviderAPI`
 * to decide the page's title and description. They are meta tags, so nothing here is
 * private.
 *
 * Every field stays `undefined` when unset rather than becoming `''`, so a caller can
 * tell "no override, compose the default" from "an override that happens to be empty" —
 * the distinction the whole override model rests on.
 */
export function mapProviderSeo(provider: Pick<Provider, 'seoTitle' | 'seoDescription' | 'seoKeywords' | 'slug'>) {
  return {
    title: provider.seoTitle ?? undefined,
    description: provider.seoDescription ?? undefined,
    keywords: provider.seoKeywords ?? undefined,
    slug: provider.slug ?? undefined,
  }
}

/**
 * A provider as its **own owner** sees it.
 *
 * The identity email and its verification state live here and nowhere else —
 * `mapSingleProvider` feeds the public detail route, and `GET /providers` enumerates it.
 *
 * `emailVerifiedAt` used to be spliced on by `routes/providers.ts` *after* the mapper ran,
 * which is why the public and owner payloads disagreed about whether `details` carried it.
 * `server/CLAUDE.md` requires Prisma shapes to reach the client through this file; a route
 * reaching past the mapper to add a field is the same leak by another route.
 */
export function mapProviderProfile(
  provider: ProviderWithRelations & { user: { email: string; emailVerifiedAt: Date | null } }
) {
  const single = mapSingleProvider(provider)
  return {
    ...single,
    details: {
      ...single.details,
      email: provider.user.email,
      emailVerifiedAt: provider.user.emailVerifiedAt?.toISOString(),
    },
    personal: { plan: provider.plan },
  }
}

export function mapService(service: Service) {
  return {
    id: service.id,
    name: service.name,
    duration: service.durationMinutes,
    categoryId: service.categoryId,
    description: service.description ?? undefined,
    price: service.price ? Number(service.price) : undefined,
    currency: service.currency ?? undefined,
    image: service.imageUrl ?? undefined,
  }
}

export function mapCategoryDetail(
  category: Category,
  organizations: ReturnType<typeof mapBasicOrganization>[],
  providers: ReturnType<typeof mapBasicProvider>[]
) {
  return {
    id: category.id,
    name: category.name,
    organizations,
    providers,
  }
}

/**
 * `firstName` and `lastName` stay separate all the way to the client — the DB never
 * stores a joined name. Callers that need one display string join it themselves.
 */
export function mapConsumer(consumer: {
  id: string
  firstName: string
  lastName: string
  phoneCode: number
  phoneNumber: bigint
  description?: string | null
  user: { email: string }
}) {
  return {
    id: consumer.id,
    basic: {
      firstName: consumer.firstName,
      lastName: consumer.lastName,
      // One representation, not two. The pre-formatted `phoneNumber: '+374…'` string this
      // replaces existed only as a fallback for when `phone` might be absent; the columns
      // are NOT NULL now, so it always is present and the client formats for display.
      phone: {
        code: consumer.phoneCode,
        number: Number(consumer.phoneNumber),
      },
      // Non-optional: a Consumer always has a User, and a User always has an identity
      // email. A consumer's client reads `basic.email` where a provider's reads
      // `details.email` — see `src/app/CLAUDE.md`. `emailVerifiedAt` is deliberately not
      // here: both roles read it from `details`, so it has one home per payload.
      email: consumer.user.email,
      description: consumer.description ?? undefined,
    },
  }
}

/* ------------------------------------------------------------------ *
 * A booking as its own provider sees it.
 * ------------------------------------------------------------------ */

type BookingWithBooker = {
  id: string
  startAt: Date
  endAt: Date
  durationMinutes: number
  status: string
  notes: string | null
  paymentMethods: string[]
  price: Prisma.Decimal | null
  currency: string | null
  createdAt: Date
  serviceId: string
  service: { id: string; name: string } | null
  consumerId: string | null
  consumer: {
    id: string
    firstName: string
    lastName: string
    phoneCode: number
    phoneNumber: bigint
    user: { email: string }
  } | null
  guestFirstName: string | null
  guestLastName: string | null
  guestPhoneCode: number | null
  guestPhoneNumber: bigint | null
  guestEmail: string | null
}

/**
 * Whoever booked, under whichever identity they had.
 *
 * A signed-in booking carries a Consumer relation and a guest booking carries its own
 * columns; exactly one is present, enforced by the `appointment_actor_present` CHECK.
 * Flattening both into one shape here means the provider's list renders one row type
 * rather than branching per booking.
 *
 * **This is the one place a consumer's phone and email reach a provider**, and it is
 * deliberate: a day's client list that cannot be phoned is not a client list. It is
 * reachable only from `/provider-profile/bookings`, which is scoped by session to the
 * provider those appointments belong to — never from a lookup keyed on a guessable id.
 * See `server/CLAUDE.md`.
 */
function mapBooker(booking: BookingWithBooker) {
  if (booking.consumer) {
    return {
      kind: 'consumer' as const,
      id: booking.consumer.id,
      firstName: booking.consumer.firstName,
      lastName: booking.consumer.lastName,
      // The identity email, read through the `User` relation — a Consumer no longer holds
      // one of its own. The phone comes off the Consumer row, which is where it moved.
      email: booking.consumer.user.email,
      // `Number(...)`, as every other BigInt crossing this boundary does — JSON has no
      // BigInt and `JSON.stringify` throws on one.
      phone: {
        code: booking.consumer.phoneCode,
        number: Number(booking.consumer.phoneNumber),
      },
    }
  }

  return {
    kind: 'guest' as const,
    id: undefined,
    firstName: booking.guestFirstName ?? '',
    lastName: booking.guestLastName ?? '',
    email: booking.guestEmail ?? undefined,
    phone: {
      code: booking.guestPhoneCode ?? 0,
      number: Number(booking.guestPhoneNumber ?? 0),
    },
  }
}

export function mapProviderBooking(booking: BookingWithBooker) {
  return {
    id: booking.id,
    time: {
      startDate: booking.startAt.toISOString(),
      endDate: booking.endAt.toISOString(),
      duration: booking.durationMinutes,
    },
    status: booking.status,
    notes: booking.notes ?? undefined,
    paymentMethods: booking.paymentMethods,
    // The snapshot taken at booking time, not the service's price today. Null on rows
    // booked before the snapshot column existed and on services that carry no price.
    price: booking.price ? Number(booking.price) : undefined,
    currency: booking.currency ?? undefined,
    createdAt: booking.createdAt.toISOString(),
    service: booking.service
      ? { id: booking.service.id, name: booking.service.name }
      : { id: booking.serviceId, name: '' },
    booker: mapBooker(booking),
  }
}

/**
 * Everything `mapProviderBooking` reads, and nothing else.
 *
 * The `user` join survives, but now for the identity **email** rather than the phone —
 * phone moved onto the Consumer row and email moved onto User.
 */
export const providerBookingInclude = {
  service: { select: { id: true, name: true } },
  consumer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneCode: true,
      phoneNumber: true,
      user: { select: { email: true } },
    },
  },
} as const

/**
 * For the **public** provider payloads.
 *
 * `user` is deliberately absent: phone is on the Provider row now, and the only thing left
 * on `User` that these payloads could reach is the identity email, which no public read may
 * load. Three call sites lose a join as a result — the public detail route,
 * `GET /appointments`, and a consumer's favourites.
 */
export const providerInclude = {
  categories: { include: { category: true } },
  organization: { include: { categories: { include: { category: true } } } },
  services: true,
  gallery: true,
} as const

/** `providerInclude` plus the identity email, for the owner's own `GET /provider-profile`. */
export const providerProfileInclude = {
  ...providerInclude,
  user: { select: { email: true, emailVerifiedAt: true } },
} as const

/**
 * What a provider *card* needs, and nothing else.
 *
 * `providerInclude` additionally pulls `user`, every `Service` row and the whole
 * gallery — three joins per provider that `mapBasicProvider` never reads. On a
 * one-shot full list that was merely wasteful; on a paged, searchable Explore it
 * would be paid on every keystroke.
 */
export const providerListInclude = {
  categories: { include: { category: true } },
  organization: { include: { categories: { include: { category: true } } } },
} as const

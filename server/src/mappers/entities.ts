import type { Prisma } from '@prisma/client'
import type { Category, Organization, Provider, Review, ReviewReport, Service } from '@prisma/client'
import { isOpenToday } from '../services/providerSearch.js'
import { reviewAuthorName } from '../services/reviews.js'

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
      /**
       * Same predicate as Explore's `openToday` filter, so the card's Closed
       * state cannot disagree with a list that was filtered on hours today.
       */
      openToday: isOpenToday(provider.weekSchedule),
      /**
       * On `basic` rather than `details` so the Explore card gets it: `BasicProvider` is
       * `Pick<ProviderProfile, 'id' | 'basic'>`, so anything here reaches the card for
       * free, and `providerListInclude` needs no new join to serve it — these are
       * columns on the row.
       *
       * `ratingScore` is deliberately **not** published. It is a ranking input, and
       * showing a 4.09 beside "1 review" would read as the rating itself rather than as
       * a rating shrunk toward the prior.
       */
      rating: { average: provider.ratingAvg, count: provider.ratingCount },
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
    provider.weekSchedule && typeof provider.weekSchedule === 'object' ? provider.weekSchedule : defaultWeekSchedule

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
export function mapProviderSeo(provider: Pick<Provider, 'seoTitle' | 'seoDescription' | 'slug'>) {
  return {
    title: provider.seoTitle ?? undefined,
    description: provider.seoDescription ?? undefined,
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
 * The caller is the consumer on these rows, so the *other* provider is who the
 * row names. Phone and email stay off this payload on purpose — those belong
 * on `mapProviderBooking` for the provider's own client list, not here.
 */
type BookingWithProvider = {
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
  provider: { id: string; firstName: string; lastName: string }
}

export function mapConsumerSideBooking(booking: BookingWithProvider) {
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
    price: booking.price ? Number(booking.price) : undefined,
    currency: booking.currency ?? undefined,
    createdAt: booking.createdAt.toISOString(),
    service: booking.service
      ? { id: booking.service.id, name: booking.service.name }
      : { id: booking.serviceId, name: '' },
    booker: {
      kind: 'provider' as const,
      id: booking.provider.id,
      firstName: booking.provider.firstName,
      lastName: booking.provider.lastName,
    },
  }
}

export const consumerSideBookingInclude = {
  service: { select: { id: true, name: true } },
  provider: { select: { id: true, firstName: true, lastName: true } },
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

/* ------------------------------------------------------------------ *
 * Reviews
 * ------------------------------------------------------------------ */

/**
 * The author's two name columns and **nothing else**.
 *
 * Not `consumer: true`, and emphatically not `consumer: { include: { user: true } }`.
 * `GET /consumers` was deleted from this API for returning consumers' names and phone
 * numbers to anyone who asked (`server/CLAUDE.md`, "Consumers are never public"), and a
 * public review list is the same exposure by another route — it is reachable by anyone,
 * on every provider page, with no session at all.
 *
 * `select` rather than `include` is what makes that structural: a later `include` on the
 * relation would quietly widen every review payload, where extending this list is a
 * visible edit.
 */
export const reviewListInclude = {
  consumer: { select: { firstName: true, lastName: true } },
} as const

type ReviewWithAuthor = Review & { consumer: { firstName: string; lastName: string } }

/**
 * A single review, as the public list and the write responses return it.
 *
 * Three things are absent by design:
 *
 * - **`consumerId`.** The client never needs it — `isMine` below answers the only
 *   question it was for — and publishing it would hand every visitor a key to the
 *   consumer table's id space.
 * - **The author's surname.** `reviewAuthorName` reduces it to an initial.
 * - **`hiddenAt` / `hiddenReason`.** A hidden review is filtered out of every public read
 *   entirely, so there is no state to describe; leaking the reason would publish the
 *   moderation note.
 *
 * `viewerConsumerId` is passed by the route from the session, never from the request, so
 * `isMine` cannot be asked about somebody else.
 */
export function mapReview(review: ReviewWithAuthor, viewerConsumerId?: string) {
  return {
    id: review.id,
    author: reviewAuthorName(review.consumer.firstName, review.consumer.lastName),
    rating: review.rating,
    comment: review.comment ?? undefined,
    reply: review.providerReply ?? undefined,
    // `Date -> ISO string`, as every other date crossing this boundary is.
    repliedAt: review.providerRepliedAt?.toISOString(),
    createdAt: review.createdAt.toISOString(),
    // Only surfaced when it differs, so the UI can show "edited" without comparing
    // timestamps itself and without a second date on every unedited review.
    updatedAt: review.updatedAt.getTime() === review.createdAt.getTime() ? undefined : review.updatedAt.toISOString(),
    isMine: Boolean(viewerConsumerId) && review.consumerId === viewerConsumerId,
  }
}

/** What the admin queue shows: the report, plus enough of the review to judge it. */
export function mapReviewReport(report: ReviewReport & { review: ReviewWithAuthor & { provider: Provider | null } }) {
  return {
    id: report.id,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString(),
    review: {
      // The admin payload carries the moderation state the public one omits — that is
      // the entire job of this screen.
      ...mapReview(report.review),
      isHidden: Boolean(report.review.hiddenAt),
      providerId: report.review.providerId ?? undefined,
      providerName: report.review.provider
        ? `${report.review.provider.firstName} ${report.review.provider.lastName}`
        : undefined,
    },
  }
}

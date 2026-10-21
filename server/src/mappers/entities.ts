import type { Prisma } from '@prisma/client'
import type { BillingStatus, Category, Organization, Provider, Review, ReviewReport, Service } from '@prisma/client'
import { uniqueCategories } from '../services/categories.js'
import {
  ADDON_GRANT_SELECT,
  type AddonGrant,
  effectivePlan,
  type EntitlementFields,
  getEntitlements,
  isGrantLive,
} from '../services/plans.js'
import { isOpenToday, PUBLIC_PROVIDER_WHERE } from '../services/providerSearch.js'
import { reviewAuthorName } from '../services/reviews.js'

type ProviderWithRelations = Provider & {
  categories: { category: Category }[]
  organization: Organization | null
  services?: Service[]
  gallery?: { name: string; url: string }[]
  /** Present when the query included `user` — public detail and owner profile both do. */
  user?: { email: string; emailVerifiedAt?: Date | null }
}

/**
 * A detail payload's provider: what `providerInclude` loads, add-ons included, because the
 * page's branding line is an entitlement. Not on `ProviderWithRelations`, which Explore's
 * cards share through `providerListInclude` and which never gate anything.
 */
type EntitledProvider = ProviderWithRelations & { addons: readonly AddonGrant[] }

/**
 * The add-ons a provider holds right now, one row per source — owner and admin payloads
 * only. Merged, they are already in `entitlements`; listed, they say what is paid for
 * (`paddle`) and what was granted (`admin`), and until when.
 */
const mapLiveAddons = (grants: readonly AddonGrant[], now: Date) =>
  grants
    .filter((grant) => grant.quantity > 0 && isGrantLive(grant, now))
    .map((grant) => ({
      addon: grant.addon,
      quantity: grant.quantity,
      source: grant.source,
      expiresAt: grant.expiresAt?.toISOString(),
    }))

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

/**
 * What an organization read needs for its categories: its **listed** providers' — an
 * organization holds none of its own (see `Category` in the schema), and an unlisted page's
 * choice is not public. Every route that shows an organization's categories includes this.
 */
export const organizationInclude = {
  providers: { where: PUBLIC_PROVIDER_WHERE, select: { categories: { select: { category: true } } } },
} satisfies Prisma.OrganizationInclude

type OrganizationWithProviders = Organization & { providers?: { categories: { category: Category }[] }[] }

/** Its providers' categories, each once. Empty when the read did not include them. */
const organizationCategories = (org: OrganizationWithProviders) =>
  uniqueCategories(org.providers?.flatMap((provider) => provider.categories.map((c) => mapBasicCategory(c.category))) ?? [])

export function mapBasicOrganization(org: OrganizationWithProviders) {
  return {
    id: org.id,
    basic: {
      name: org.name,
      categories: organizationCategories(org),
      description: org.description,
    },
  }
}

export function mapOrganization(org: OrganizationWithProviders) {
  return {
    id: org.id,
    basic: {
      name: org.name,
      categories: organizationCategories(org),
      description: org.description,
    },
    details: {
      phone: org.phone,
      country: org.country,
      location: { address: org.address, url: org.locationUrl },
      website: org.website,
      logoUrl: org.logoUrl,
    },
  }
}

export function mapBasicProvider(provider: ProviderWithRelations) {
  return {
    id: provider.id,
    basic: {
      fullName: provider.fullName,
      description: provider.description ?? undefined,
      image: provider.imageUrl ?? undefined,
      categories: provider.categories.map((c) => mapBasicCategory(c.category)),
      organization: provider.organization ? mapBasicOrganization(provider.organization) : undefined,
      available: provider.available,
      /**
       * Same predicate as Explore's `openToday` filter, so the card's Closed
       * state cannot disagree with a list that was filtered on hours today —
       * and "today" is the provider's, in their own zone.
       */
      openToday: isOpenToday(provider.weekSchedule, new Date(), provider.timeZone),
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

/** The service a search matched, as its result card prints it — not the whole `mapService`. */
export function mapMatchedService(service: Pick<Service, 'id' | 'name' | 'durationMinutes' | 'price' | 'currency'>) {
  return {
    id: service.id,
    name: service.name,
    duration: service.durationMinutes,
    price: service.price === null ? undefined : Number(service.price),
    currency: service.currency ?? undefined,
  }
}

/**
 * One Explore result: the card's `mapBasicProvider`, plus — when a service is what the
 * search found — that service and how many more matched. Its own function rather than a
 * field on `mapBasicProvider`, which favourites, categories and appointments share.
 */
export function mapProviderListItem(
  provider: ProviderWithRelations,
  match?: { service: Parameters<typeof mapMatchedService>[0]; more: number }
) {
  if (!match) return mapBasicProvider(provider)
  return {
    ...mapBasicProvider(provider),
    matchedService: mapMatchedService(match.service),
    moreMatchingServices: match.more || undefined,
  }
}

/**
 * Contact half of a provider's detail payload.
 *
 * `email` is the identity `User.email` — the same address the account signs in with.
 * It is on the public payload on purpose: there is no separate published contact email.
 * Changing it still goes only through `/identity/change-email` (password + verified link);
 * `PUT /provider-profile` must never write it.
 */
export function mapProviderDetails(
  provider: ProviderWithRelations & {
    paymentInfo?: unknown
    requiresBookingApproval?: boolean
    phoneVisible?: boolean
    showClockChoices?: boolean
  }
) {
  const weekSchedule =
    provider.weekSchedule && typeof provider.weekSchedule === 'object' ? provider.weekSchedule : defaultWeekSchedule

  // Absent on a payload written before the column existed; treat as shown, matching the
  // schema default and every provider's behaviour before this flag existed.
  const phoneVisible = provider.phoneVisible !== false

  return {
    location: {
      address: provider.address,
      url: provider.locationUrl,
    },
    // Hidden numbers stay off this public mapper entirely; the owner payload re-adds them.
    phone: phoneVisible ? { code: provider.phoneCode, number: Number(provider.phoneNumber) } : undefined,
    country: provider.country ?? undefined,
    email: provider.user?.email,
    gallery: provider.gallery?.map((g) => ({ name: g.name, url: g.url })) ?? [],
    weekSchedule,
    /**
     * The zone `weekSchedule` is written in. **Public on purpose**: the booking grid steps
     * the hours into instants in this zone and labels its times with it. Absent when the
     * provider never set one — the page then reads the hours in the visitor's own zone,
     * which is all it could ever do before the column existed.
     */
    timeZone: provider.timeZone ?? undefined,
    /**
     * 12- or 24-hour, for every time this provider's pages print. **Public on purpose**, like
     * `timeZone`: the booking grid and the hours list format with it. Absent when the provider
     * never chose — each reader's locale decides then.
     */
    timeFormat: provider.timeFormat ?? undefined,
    /**
     * Whether the booking page offers a time-zone list and a 12/24-hour switch. **Public
     * on purpose**: the page can only hide them if the payload says so. One flag for both.
     * Missing means shown, which is the column default and every page from before it existed.
     */
    showClockChoices: provider.showClockChoices !== false,
    paymentInfo: provider.paymentInfo ?? undefined,
    /**
     * **Public on purpose.** The booking sheet says "your request will be sent for
     * approval" instead of "confirmed" when this is on, and it can only do that if the
     * public payload carries it. What it discloses is how the provider runs their diary,
     * which the very next screen tells the visitor anyway.
     *
     * Optional in the type so a payload written before the column existed still parses.
     */
    requiresBookingApproval: provider.requiresBookingApproval ?? false,
  }
}

/**
 * Whether the public page offers its calendar, and if not, why — in words that say
 * nothing about the provider's plan. `paused` is the provider's own switch, `full` a
 * monthly booking allowance reached; to a visitor both read "contact them directly".
 */
export type OnlineBooking = 'open' | 'paused' | 'full'

export const resolveOnlineBooking = (provider: { available: boolean }, bookingsFull = false): OnlineBooking => {
  if (!provider.available) return 'paused'
  return bookingsFull ? 'full' : 'open'
}

/**
 * `bookingsFull` is resolved by `GET /providers/:id` alone, because it costs a count.
 * Every other caller — the manage page's nested provider — gets `open` or `paused`: a
 * reschedule moves a booking that already exists, so an allowance never closes it.
 */
export function mapSingleProvider(provider: EntitledProvider, options: { bookingsFull?: boolean } = {}) {
  const details = {
    ...mapProviderDetails(provider),
    onlineBooking: resolveOnlineBooking(provider, options.bookingsFull),
    /**
     * Whether the page shows its "Booking page by Bookie" line. Plan-neutral like
     * `onlineBooking`: a boolean about the page, never which plan removed it — a visitor is
     * never told about a plan (`server/CLAUDE.md`).
     */
    showPoweredBy: !getEntitlements(provider, new Date()).removeBranding,
  }

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
 * `emailVerifiedAt` and `phoneVisible` (plus a hidden phone) live here and nowhere else —
 * the public mapper already carries `email` for the public page, but verification state
 * and phone visibility are settings-only.
 *
 * `emailVerifiedAt` used to be spliced on by `routes/providers.ts` *after* the mapper ran,
 * which is why the public and owner payloads disagreed about whether `details` carried it.
 * `server/CLAUDE.md` requires Prisma shapes to reach the client through this file; a route
 * reaching past the mapper to add a field is the same leak by another route.
 */
export function mapProviderProfile(
  provider: EntitledProvider & {
    user: { email: string; emailVerifiedAt: Date | null }
    phoneVisible?: boolean
  },
  now: Date = new Date()
) {
  const single = mapSingleProvider(provider)
  // The public mapper omits a hidden phone; the owner still needs the number to edit it
  // and the visibility flag to drive the settings toggle.
  const phone = { code: provider.phoneCode, number: Number(provider.phoneNumber) }
  return {
    ...single,
    details: {
      ...single.details,
      email: provider.user.email,
      emailVerifiedAt: provider.user.emailVerifiedAt?.toISOString(),
      phone,
      phoneVisible: provider.phoneVisible !== false,
    },
    personal: mapProviderPlan(provider, now),
  }
}

/**
 * A provider's plan as its owner sees it — on `personal`, which only the owner payload
 * carries. `plan` is what was assigned; `effectivePlan` is what applies right now, which
 * differs only once `planExpiresAt` has passed. `entitlements` are the limits of the
 * *effective* plan with every live add-on on top, so a client never re-derives them (and
 * never needs the catalogue); `addons` lists those add-ons.
 */
export function mapProviderPlan(provider: EntitlementFields, now: Date) {
  return {
    plan: provider.plan,
    effectivePlan: effectivePlan(provider, now),
    planExpiresAt: provider.planExpiresAt?.toISOString(),
    entitlements: getEntitlements(provider, now),
    addons: mapLiveAddons(provider.addons, now),
  }
}

/**
 * The provider's Paddle subscription as the Plan tab shows it — `null` for a provider who
 * has never subscribed (an admin-assigned plan has no billing to show). Owner-only: it is
 * served by `GET /provider-profile/plan` alone, never on a public payload.
 *
 * `manageable` is whether the billing portal can be opened, which needs only a Paddle
 * customer — a cancelled subscriber can still reach their invoices.
 */
export function mapProviderBilling(provider: {
  paddleCustomerId: string | null
  billingStatus: BillingStatus | null
  billingPeriodEndsAt: Date | null
  billingCancelsAt: Date | null
}) {
  if (!provider.billingStatus) return null
  return {
    status: provider.billingStatus,
    periodEndsAt: provider.billingPeriodEndsAt?.toISOString(),
    cancelsAt: provider.billingCancelsAt?.toISOString(),
    manageable: Boolean(provider.paddleCustomerId),
  }
}

export function mapService(service: Service) {
  return {
    id: service.id,
    name: service.name,
    duration: service.durationMinutes,
    description: service.description ?? undefined,
    price: service.price === null ? undefined : Number(service.price),
    currency: service.currency ?? undefined,
    image: service.imageUrl ?? undefined,
    active: service.active,
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

/** One `fullName`, as the account holder wrote it — see `Provider.fullName`. */
export function mapConsumer(consumer: {
  id: string
  fullName: string
  phoneCode: number
  phoneNumber: bigint
  user: { email: string }
}) {
  return {
    id: consumer.id,
    basic: {
      fullName: consumer.fullName,
      // One representation, not two. The pre-formatted `phoneNumber: '+374…'` string this
      // replaces existed only as a fallback for when `phone` might be absent; the columns
      // are NOT NULL now, so it always is present and the client formats for display.
      phone: {
        code: consumer.phoneCode,
        number: Number(consumer.phoneNumber),
      },
      // Non-optional: a Consumer always has a User, and a User always has an identity
      // email. A consumer's client reads `basic.email` where a provider's reads
      // `details.email`. `emailVerifiedAt` is deliberately not
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
    fullName: string
    phoneCode: number
    phoneNumber: bigint
    user: { email: string }
  } | null
  guestFullName: string | null
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
      fullName: booking.consumer.fullName,
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
    fullName: booking.guestFullName ?? '',
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
    price: booking.price === null ? undefined : Number(booking.price),
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
      fullName: true,
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
  provider: { id: string; fullName: string }
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
    price: booking.price === null ? undefined : Number(booking.price),
    currency: booking.currency ?? undefined,
    createdAt: booking.createdAt.toISOString(),
    service: booking.service
      ? { id: booking.service.id, name: booking.service.name }
      : { id: booking.serviceId, name: '' },
    booker: {
      kind: 'provider' as const,
      id: booking.provider.id,
      fullName: booking.provider.fullName,
    },
  }
}

export const consumerSideBookingInclude = {
  service: { select: { id: true, name: true } },
  provider: { select: { id: true, fullName: true } },
} as const

/**
 * For provider **detail** payloads (public page, appointments nested provider, …).
 *
 * `user.email` is included because that is the contact address the public profile shows —
 * there is no separate published email column. Explore cards use `providerListInclude`
 * instead and never load the user.
 */
export const providerInclude = {
  categories: { include: { category: true } },
  // Plain: a provider payload names its organization but never shows that organization's
  // categories, and deriving them would join every sibling provider.
  organization: true,
  // Public payloads only ever show a live catalogue. Structural rather than per-route:
  // six call sites read this include and one of them is a public booking page.
  services: { where: { active: true } },
  gallery: true,
  user: { select: { email: true } },
  // `showPoweredBy` is an entitlement, and an add-on can grant it.
  addons: { select: ADDON_GRANT_SELECT },
} as const

/** `providerInclude` plus verification state, for the owner's own `GET /provider-profile`. */
export const providerProfileInclude = {
  ...providerInclude,
  services: true, // the owner sees their own deactivated services
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
  organization: true,
} as const

/* ------------------------------------------------------------------ *
 * Reviews
 * ------------------------------------------------------------------ */

/**
 * The author's name column and **nothing else**.
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
  consumer: { select: { fullName: true } },
} as const

type ReviewWithAuthor = Review & { consumer: { fullName: string } }

/**
 * A single review, as the public list and the write responses return it.
 *
 * Three things are absent by design:
 *
 * - **`consumerId`.** The client never needs it — `isMine` below answers the only
 *   question it was for — and publishing it would hand every visitor a key to the
 *   consumer table's id space.
 * - **The author's surname.** `reviewAuthorName` reduces the last word of the name to an
 *   initial.
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
    author: reviewAuthorName(review.consumer.fullName),
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

/**
 * A row of the admin plan screen: enough to find the right account and see what it is on.
 * The account email is here because it is how an operator matches an invoice or a support
 * request to a provider — the route is behind `requireAdmin`, and nothing else maps it.
 */
export function mapAdminProvider(
  provider: EntitlementFields & {
    id: string
    fullName: string
    slug: string | null
    listed: boolean
    paddleSubscriptionId: string | null
    billingStatus: BillingStatus | null
    user: { email: string }
  },
  now: Date
) {
  return {
    id: provider.id,
    name: provider.fullName,
    email: provider.user.email,
    slug: provider.slug ?? undefined,
    listed: provider.listed,
    plan: provider.plan,
    effectivePlan: effectivePlan(provider, now),
    planExpiresAt: provider.planExpiresAt?.toISOString(),
    /**
     * Live add-ons from both sources. An admin's grant (`admin`) survives every webhook; the
     * paid ones (`paddle`) are shown so a comp is not given for something already bought.
     */
    addons: mapLiveAddons(provider.addons, now),
    /**
     * `'paddle'` while a Paddle subscription is live: its webhook will overwrite whatever an
     * admin saves here on its next event, so the admin screen says so.
     */
    billing:
      provider.paddleSubscriptionId && provider.billingStatus && provider.billingStatus !== 'canceled'
        ? ('paddle' as const)
        : undefined,
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
      providerName: report.review.provider?.fullName,
    },
  }
}

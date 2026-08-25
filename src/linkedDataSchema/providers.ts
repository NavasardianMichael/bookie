import { Graph, Offer, OfferCatalog, Person, ProfessionalService } from 'schema-dts'
import { BasicProvider } from '@store/providers/list/types'
import { ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { formatDuration } from '@helpers/duration'
import { generateEntityUrl } from '@helpers/entities'
import { resolveAbsoluteAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { absoluteUrl } from '@helpers/url'
import { getBreadcrumbLDSchema } from './breadcrumbs'
import { getOpeningHoursLDSchema } from './schedule'

const getFullName = (provider: BasicProvider | SingleProvider): string =>
  `${provider.basic.firstName} ${provider.basic.lastName}`.trim()

/**
 * schema.org has no duration property in `Service`'s domain — `timeRequired`
 * belongs to CreativeWork/Action — so the length is stated in the offer name,
 * where an LLM reader picks it up, while the page itself carries the machine form
 * as `<time datetime="PT30M">`.
 *
 * `priceCurrency` is required alongside `price`, so neither is emitted alone.
 */
const getServiceOffer = (service: ProviderService): Offer => {
  const offer: Offer = {
    '@type': 'Offer',
    name: `${service.name} (${formatDuration(service.duration)})`,
    description: service.description,
    itemOffered: {
      '@type': 'Service',
      name: service.name,
      description: service.description,
      serviceType: service.name,
    },
  }

  if (service.price !== undefined && service.currency) {
    offer.price = service.price
    offer.priceCurrency = service.currency
  }

  return offer
}

/** Free text per schema.org, but only meaningful if every priced service shares a currency. */
const getPriceRange = (services: ProviderService[]): string | undefined => {
  const priced = services.filter((service) => service.price !== undefined && service.currency)
  if (!priced.length) return undefined

  const currencies = new Set(priced.map((service) => service.currency))
  if (currencies.size > 1) return undefined

  const prices = priced.map((service) => service.price as number)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const currency = priced[0].currency

  return min === max ? `${min} ${currency}` : `${min} - ${max} ${currency}`
}

/** Card-level payload: BasicProvider carries no `details`, so there is nothing but identity to state. */
export const getBasicProviderLDSchema = (provider: BasicProvider): Person => ({
  '@type': 'Person',
  '@id': `${generateEntityUrl(ROUTE_KEYS.providers, provider.id)}#person`,
  name: getFullName(provider),
  givenName: provider.basic.firstName,
  familyName: provider.basic.lastName,
  description: provider.basic.description,
  image: resolveAbsoluteAssetUrl(provider.basic.image),
  url: generateEntityUrl(ROUTE_KEYS.providers, provider.id),
})

/**
 * A graph rather than a single node.
 *
 * A provider is two entities at once: a `Person` (who they are) and a bookable
 * `ProfessionalService` (what can be reserved, when, and at what price). Google
 * resolves the practitioner from the former and the rich-result eligibility —
 * opening hours, offers, price range — from the latter, and `@id` cross-references
 * keep them recognisably the same subject instead of two unrelated things.
 *
 * This also covers `services` and `weekSchedule`, which had no representation at
 * all: both are fetched on the server but only rendered inside the client
 * calendar, so nothing about them reached a crawler.
 */
export const getProviderLDSchema = (provider: SingleProvider): Graph => {
  const { basic, details, services } = provider

  const pageUrl = generateEntityUrl(ROUTE_KEYS.providers, provider.id)
  const businessId = `${pageUrl}#business`
  const personId = `${pageUrl}#person`

  const fullName = getFullName(provider)
  const image = resolveAbsoluteAssetUrl(basic.image)
  const serviceList = services.allIds.map((id) => services.byId[id!]).filter(Boolean)
  const categoryNames = basic.categories?.map((category) => category.name) ?? []
  const openingHours = getOpeningHoursLDSchema(details.weekSchedule)

  const organization = basic.organization
  const employer = organization
    ? {
        '@type': 'Organization' as const,
        '@id': `${generateEntityUrl(ROUTE_KEYS.organizations, organization.id)}#organization`,
        name: organization.basic.name,
        url: generateEntityUrl(ROUTE_KEYS.organizations, organization.id),
      }
    : undefined

  const offerCatalog: OfferCatalog | undefined = serviceList.length
    ? {
        '@type': 'OfferCatalog',
        name: `Services by ${fullName}`,
        itemListElement: serviceList.map(getServiceOffer),
      }
    : undefined

  const person: Person = {
    '@type': 'Person',
    '@id': personId,
    name: fullName,
    givenName: basic.firstName,
    familyName: basic.lastName,
    description: basic.description,
    image,
    url: pageUrl,
    telephone: generateFriendlyPhoneNumber(details.phone, { prefix: '+' }),
    email: details.email,
    jobTitle: categoryNames.length ? categoryNames : undefined,
    worksFor: employer,
    workLocation: {
      '@type': 'Place',
      name: details.location.address,
      address: details.location.address,
    },
  }

  const business: ProfessionalService = {
    '@type': 'ProfessionalService',
    '@id': businessId,
    name: fullName,
    description: basic.description,
    image,
    url: pageUrl,
    telephone: generateFriendlyPhoneNumber(details.phone, { prefix: '+' }),
    email: details.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: details.location.address,
      addressCountry: details.country,
    },
    hasMap: details.location.url ?? generateGoogleMapsLink(details.location.address),
    parentOrganization: employer,
    employee: { '@id': personId },
    knowsAbout: categoryNames.length ? categoryNames : undefined,
    openingHoursSpecification: openingHours.length ? openingHours : undefined,
    hasOfferCatalog: offerCatalog,
    priceRange: getPriceRange(serviceList),
    // The explicit "this page takes bookings" signal. Without it a crawler has to
    // infer bookability from the calendar, which is client-rendered.
    potentialAction: {
      '@type': 'ReserveAction',
      name: `Book an appointment with ${fullName}`,
      target: {
        '@type': 'EntryPoint',
        urlTemplate: pageUrl,
      },
      result: {
        '@type': 'Reservation',
        name: `Appointment with ${fullName}`,
      },
    },
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      business,
      person,
      getBreadcrumbLDSchema([
        { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
        { name: 'Providers', path: ROUTES[ROUTE_KEYS.providers] },
        { name: fullName, path: `${ROUTES[ROUTE_KEYS.providers]}/${provider.id}` },
      ]),
    ],
  }
}

/**
 * `ItemList` rather than a bare `@graph` of people: a graph states that these
 * entities exist, a list states that this page *is* the collection and in what
 * order — which is what makes list pages eligible for carousel results.
 */
export const getProvidersListLDSchema = (providers: BasicProvider[]): Graph => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': absoluteUrl(ROUTES[ROUTE_KEYS.providers]),
      name: 'Providers',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: providers.length,
        itemListElement: providers.map((provider, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: generateEntityUrl(ROUTE_KEYS.providers, provider.id),
          item: getBasicProviderLDSchema(provider),
        })),
      },
    },
    getBreadcrumbLDSchema([
      { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
      { name: 'Providers', path: ROUTES[ROUTE_KEYS.providers] },
    ]),
  ],
})

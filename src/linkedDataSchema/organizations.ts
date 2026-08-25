import { Graph, Organization as OrganizationLD } from 'schema-dts'
import { BasicOrganization, Organization } from '@store/organizations/single/types'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { generateEntityUrl } from '@helpers/entities'
import { resolveAbsoluteAssetUrl } from '@helpers/images'
import { generateGoogleMapsLink } from '@helpers/location'
import { absoluteUrl } from '@helpers/url'
import { getBreadcrumbLDSchema } from './breadcrumbs'

/** Card-level payload: BasicOrganization carries no `details`. */
export const getBasicOrganizationLDSchema = (organization: BasicOrganization): OrganizationLD => ({
  '@type': 'Organization',
  '@id': `${generateEntityUrl(ROUTE_KEYS.organizations, organization.id)}#organization`,
  name: organization.basic.name,
  description: organization.basic.description,
  url: generateEntityUrl(ROUTE_KEYS.organizations, organization.id),
})

/**
 * `LocalBusiness`, not plain `Organization`: this page carries an address, a
 * phone number and a map link, which is exactly what makes a business eligible
 * for local results. The page had no structured data at all before.
 */
export const getOrganizationLDSchema = (organization: Organization): Graph => {
  const { basic, details } = organization
  const pageUrl = generateEntityUrl(ROUTE_KEYS.organizations, organization.id)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${pageUrl}#organization`,
        name: basic.name,
        description: basic.description,
        url: pageUrl,
        logo: resolveAbsoluteAssetUrl(details.logoUrl),
        image: resolveAbsoluteAssetUrl(details.logoUrl),
        telephone: details.phone,
        email: details.email,
        sameAs: details.website || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: details.location.address,
          addressCountry: details.country,
        },
        hasMap: details.location.url ?? generateGoogleMapsLink(details.location.address),
        knowsAbout: basic.categories.length ? basic.categories.map((category) => category.name) : undefined,
      },
      getBreadcrumbLDSchema([
        { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
        { name: 'Organizations', path: ROUTES[ROUTE_KEYS.organizations] },
        { name: basic.name, path: `${ROUTES[ROUTE_KEYS.organizations]}/${organization.id}` },
      ]),
    ],
  }
}

export const getOrganizationsListLDSchema = (organizations: BasicOrganization[]): Graph => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': absoluteUrl(ROUTES[ROUTE_KEYS.organizations]),
      name: 'Organizations',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: organizations.length,
        itemListElement: organizations.map((organization, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: generateEntityUrl(ROUTE_KEYS.organizations, organization.id),
          item: getBasicOrganizationLDSchema(organization),
        })),
      },
    },
    getBreadcrumbLDSchema([
      { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
      { name: 'Organizations', path: ROUTES[ROUTE_KEYS.organizations] },
    ]),
  ],
})

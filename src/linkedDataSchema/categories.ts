import { Graph } from 'schema-dts'
import { BasicCategory, Category } from '@store/categories/single/types'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { generateEntityUrl } from '@helpers/entities'
import { absoluteUrl } from '@helpers/url'
import { getBreadcrumbLDSchema } from './breadcrumbs'
import { getBasicOrganizationLDSchema } from './organizations'
import { getBasicProviderLDSchema } from './providers'

/**
 * A category page is a collection, so it says so: one `ItemList` holding both the
 * organizations and the providers filed under it, in render order. That ordering
 * is what a bare `@graph` of member entities cannot express.
 */
export const getCategoryLDSchema = (category: Category): Graph => {
  const pageUrl = generateEntityUrl(ROUTE_KEYS.categories, category.id)

  const members = [
    ...category.organizations.map(getBasicOrganizationLDSchema),
    ...category.providers.map(getBasicProviderLDSchema),
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': pageUrl,
        name: category.name,
        description: `Organizations and providers offering ${category.name}.`,
        url: pageUrl,
        mainEntity: {
          '@type': 'ItemList',
          name: category.name,
          numberOfItems: members.length,
          itemListElement: members.map((member, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: member,
          })),
        },
      },
      getBreadcrumbLDSchema([
        { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
        { name: 'Categories', path: ROUTES[ROUTE_KEYS.categories] },
        { name: category.name, path: `${ROUTES[ROUTE_KEYS.categories]}/${category.id}` },
      ]),
    ],
  }
}

export const getCategoriesListLDSchema = (categories: BasicCategory[]): Graph => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': absoluteUrl(ROUTES[ROUTE_KEYS.categories]),
      name: 'Categories',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: categories.length,
        itemListElement: categories.map((category, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: category.name,
          url: generateEntityUrl(ROUTE_KEYS.categories, category.id),
        })),
      },
    },
    getBreadcrumbLDSchema([
      { name: 'Home', path: ROUTES[ROUTE_KEYS.home] },
      { name: 'Categories', path: ROUTES[ROUTE_KEYS.categories] },
    ]),
  ],
})

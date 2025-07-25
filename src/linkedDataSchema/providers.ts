import { Person, WithContext } from 'schema-dts'
import { BasicProvider, Provider } from '@store/providers/profile/types'
import { ROUTE_KEYS } from '@constants/routes'
import { generateEntityUrl } from '@helpers/entities'
import { ListLDGraph } from './types'

export const getBasicProviderLDSchema = (provider: BasicProvider): WithContext<Person> => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    givenName: provider.basic.firstName,
    familyName: provider.basic.lastName,
    image: provider.basic.image,
    url: generateEntityUrl(ROUTE_KEYS.providers, provider.id),
  }
}

export const getProviderLDSchema = (provider: Provider): WithContext<Person> => {
  const ldSchema: ReturnType<typeof getProviderLDSchema> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    givenName: provider.basic.firstName,
    familyName: provider.basic.lastName,
    image: provider.basic.image,
    workLocation: provider.details.address,
    email: provider.details.email,
    telephone: provider.details.phone,
    url: generateEntityUrl(ROUTE_KEYS.providers, provider.id),
  }

  if (provider.basic.organization?.id) {
    ldSchema.worksFor = {
      '@type': 'Organization',
      name: provider.basic.organization?.basic.name,
      url: generateEntityUrl(ROUTE_KEYS.organizations, provider.basic.organization.id),
    }
  }

  return ldSchema
}

export const getProvidersListLDSchema = (providers: BasicProvider[]): ListLDGraph<WithContext<Person>> => {
  const providersListLDSchema = {
    '@context': 'https://schema.org',
    '@graph': providers.map((provider) => {
      return getBasicProviderLDSchema(provider)
    }),
  }

  return providersListLDSchema
}

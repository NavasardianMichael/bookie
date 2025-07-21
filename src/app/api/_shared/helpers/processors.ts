import { BasicCategory, Category } from '@store/categories/single/types'
import { BasicConsumer, Consumer } from '@store/consumers/profile/types'
import { BasicOrganization, Organization } from '@store/organizations/single/types'
import { BasicProvider, Provider } from '@store/providers/profile/types'

export const providerToBasic = (provider: Provider): BasicProvider => {
  return {
    id: provider.id,
    basic: provider.basic,
  }
}

export const consumerToBasic = (consumer: Consumer): BasicConsumer => {
  return {
    id: consumer.id,
    basic: consumer.basic,
  }
}

export const organizationToBasic = (organization: Organization): BasicOrganization => {
  return {
    id: organization.id,
    basic: organization.basic,
  }
}

export const categoryToBasic = (category: Category): BasicCategory => {
  return {
    id: category.id,
    name: category.name,
    organizations: category.organizations,
    providers: category.providers,
  }
}

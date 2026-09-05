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

export function mapProviderDetails(provider: ProviderWithRelations) {
  const weekSchedule =
    provider.weekSchedule && typeof provider.weekSchedule === 'object'
      ? provider.weekSchedule
      : defaultWeekSchedule

  return {
    location: {
      address: provider.address,
      url: provider.locationUrl,
    },
    phone: {
      code: provider.userId ? 0 : 0,
      number: 0,
    },
    country: provider.country ?? undefined,
    email: provider.email ?? undefined,
    gallery: provider.gallery?.map((g) => ({ name: g.name, url: g.url })) ?? [],
    weekSchedule,
  }
}

export function mapSingleProvider(provider: ProviderWithRelations & { user?: { phoneCode: number; phoneNumber: bigint } }) {
  const phoneCode = provider.user?.phoneCode ?? 374
  const phoneNumber = provider.user?.phoneNumber ?? BigInt(0)

  const details = mapProviderDetails(provider)
  details.phone = {
    code: phoneCode,
    number: Number(phoneNumber),
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
  }
}

export function mapProviderProfile(provider: ProviderWithRelations & { user?: { phoneCode: number; phoneNumber: bigint } }) {
  const single = mapSingleProvider(provider)
  return {
    ...single,
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
  email: string | null
  user: { phoneCode: number; phoneNumber: bigint }
}) {
  return {
    id: consumer.id,
    basic: {
      firstName: consumer.firstName,
      lastName: consumer.lastName,
      phoneNumber: `+${consumer.user.phoneCode}${consumer.user.phoneNumber}`,
      email: consumer.email ?? undefined,
    },
  }
}

export const providerInclude = {
  categories: { include: { category: true } },
  organization: { include: { categories: { include: { category: true } } } },
  user: true,
  services: true,
  gallery: true,
} as const

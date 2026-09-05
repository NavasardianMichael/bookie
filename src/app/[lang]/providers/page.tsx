import { getProvidersListLDSchema } from '@linkedDataSchema/providers'
import type { Metadata } from 'next'
import { getCategoriesListAPI } from '@api/categories/main'
import { getProvidersListAPI } from '@api/providers/main'
import { localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { EmptyState } from '@components/ui/EmptyState'
import { ChipRail, PageShell, ResponsiveGrid, Section } from '@components/ui/layout'
import { ProviderCard } from './ProviderCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Explore providers',
    description: 'Browse every provider on Bookie and reserve a time that works.',
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.providers]),
  }
}

export default async function Providers() {
  const [{ allIds, byId }, categories] = await Promise.all([getProvidersListAPI(), getCategoriesListAPI()])
  const providers = allIds.map((providerId) => byId[providerId!])

  return (
    <PageShell className='flex flex-col gap-10'>
      <JsonLd data={getProvidersListLDSchema(providers)} />

      <header className='mx-auto flex max-w-3xl flex-col items-center gap-4 text-center'>
        <AppTitle level='h1'>
          Find and book <span className='text-brand italic'>top-rated</span> professionals.
        </AppTitle>
      </header>

      {!!categories.allIds.length && (
        <Section
          title='Browse categories'
          actions={
            <AppLink href={ROUTES.categories} variant='plain' className='text-body-sm font-bold text-brand'>
              View all
            </AppLink>
          }
        >
          <ChipRail label='Categories'>
            <li className='shrink-0'>
              <AppLink href={ROUTES.providers} variant='chip' className='bg-brand border-brand text-white hover:text-white'>
                All services
              </AppLink>
            </li>
            {categories.allIds.map((categoryId) => {
              const category = categories.byId[categoryId!]
              return (
                <li key={category.id} className='shrink-0'>
                  <AppLink href={`${ROUTES.categories}/${category.id}`} variant='chip'>
                    {category.name}
                  </AppLink>
                </li>
              )
            })}
          </ChipRail>
        </Section>
      )}

      {providers.length ? (
        <Section title='Top service providers' count={allIds.length}>
          <ResponsiveGrid as='ul'>
            {providers.map((provider) => (
              <li key={provider.id}>
                <ProviderCard data={provider} headingLevel={2} />
              </li>
            ))}
          </ResponsiveGrid>
        </Section>
      ) : (
        <EmptyState
          title='No providers yet'
          description='Providers will appear here as soon as they publish a profile.'
        />
      )}
    </PageShell>
  )
}

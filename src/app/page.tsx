import { getSiteLDSchema } from '@linkedDataSchema/site'
import type { Metadata } from 'next'
import { getCategoriesListAPI } from '@api/categories/main'
import { getProvidersListAPI } from '@api/providers/main'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import AppLink from '@components/ui/bare/AppLink'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppTitle from '@components/ui/bare/AppTitle'
import JsonLd from '@components/ui/bare/JsonLd'
import EmptyState from '@components/ui/EmptyState'
import { PageShell, ResponsiveGrid, Section } from '@components/ui/layout'
import { ProviderCard } from './providers/ProviderCard'

export const dynamic = 'force-dynamic'

const HOME_CATEGORY_LIMIT = 8
const HOME_PROVIDER_LIMIT = 8

// The home page used to inherit the root title and description verbatim, so the
// site's most-linked page had no copy of its own for a crawler to index.
export const metadata: Metadata = {
  description: 'Find providers and organizations on Bookie, then reserve a time that works.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.home] },
}

export default async function Home() {
  const [categories, providers] = await Promise.all([getCategoriesListAPI(), getProvidersListAPI()])

  const categoryIds = categories.allIds.slice(0, HOME_CATEGORY_LIMIT)
  const providerIds = providers.allIds.slice(0, HOME_PROVIDER_LIMIT)

  return (
    <PageShell className='flex flex-col gap-10'>
      <JsonLd data={getSiteLDSchema()} />

      <section className='flex flex-col gap-5 py-4 md:py-8'>
        <AppParagraph size='overline'>Bookie</AppParagraph>
        <AppTitle level='h1' size='display' className='max-w-xl'>
          Book care that fits your day
        </AppTitle>
        <AppParagraph className='max-w-prose-content'>
          Find providers and organizations, then reserve a time that works.
        </AppParagraph>
        <div className='flex flex-wrap gap-3'>
          <AppLink href={ROUTES.providers} variant='button' tone='primary'>
            Browse providers
          </AppLink>
          <AppLink href={ROUTES.accountTypeSelection} variant='button'>
            Sign on
          </AppLink>
        </div>
      </section>

      <Section
        title='Browse by category'
        actions={
          categories.allIds.length > HOME_CATEGORY_LIMIT ? (
            <AppLink href={ROUTES.categories} variant='plain' className='text-body-sm text-brand font-medium'>
              View all
            </AppLink>
          ) : undefined
        }
      >
        {categoryIds.length ? (
          <ul className='flex flex-wrap gap-2'>
            {categoryIds.map((categoryId) => {
              const category = categories.byId[categoryId!]
              return (
                <li key={category.id}>
                  <AppLink href={`${ROUTES.categories}/${category.id}`} variant='chip'>
                    {category.name}
                  </AppLink>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState title='No categories yet' description='Categories will show up here once they are added.' />
        )}
      </Section>

      <Section
        title='Providers'
        count={providerIds.length || undefined}
        actions={
          providers.allIds.length > HOME_PROVIDER_LIMIT ? (
            <AppLink href={ROUTES.providers} variant='plain' className='text-body-sm text-brand font-medium'>
              View all
            </AppLink>
          ) : undefined
        }
      >
        {providerIds.length ? (
          <ResponsiveGrid as='ul'>
            {providerIds.map((providerId) => (
              <li key={providerId}>
                <ProviderCard data={providers.byId[providerId!]} />
              </li>
            ))}
          </ResponsiveGrid>
        ) : (
          <EmptyState
            title='No providers yet'
            description='Providers will appear here as soon as they publish a profile.'
            action={
              <AppLink href={ROUTES.accountTypeSelection} variant='button' tone='primary'>
                Sign on as a provider
              </AppLink>
            }
          />
        )}
      </Section>
    </PageShell>
  )
}

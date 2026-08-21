import Link from 'next/link'
import { getCategoriesListAPI } from '@api/categories/main'
import { getProvidersListAPI } from '@api/providers/main'
import { ROUTES } from '@constants/routes'
import EmptyState from '@components/ui/EmptyState'
import { PageShell, ResponsiveGrid, Section } from '@components/ui/layout'
import { ProviderCard } from './providers/ProviderCard'

export const dynamic = 'force-dynamic'

const HOME_CATEGORY_LIMIT = 8
const HOME_PROVIDER_LIMIT = 8

export default async function Home() {
  const [categories, providers] = await Promise.all([getCategoriesListAPI(), getProvidersListAPI()])

  const categoryIds = categories.allIds.slice(0, HOME_CATEGORY_LIMIT)
  const providerIds = providers.allIds.slice(0, HOME_PROVIDER_LIMIT)

  return (
    <PageShell className='flex flex-col gap-10'>
      <section className='flex flex-col gap-5 py-4 md:py-8'>
        <p className='text-overline text-brand-muted'>Bookie</p>
        <h1 className='text-display text-brand-text max-w-xl'>Book care that fits your day</h1>
        <p className='text-body max-w-prose-content'>
          Find providers and organizations, then reserve a time that works.
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link
            href={ROUTES.providers}
            className='bg-brand hover:bg-brand-600 active:bg-brand-700 inline-flex min-h-11 items-center justify-center rounded-brand px-4 text-body-sm font-medium text-white no-underline transition-colors'
          >
            Browse providers
          </Link>
          <Link
            href={ROUTES.accountTypeSelection}
            className='border-brand-border text-brand-text hover:border-brand hover:bg-brand-50 active:bg-brand-100 inline-flex min-h-11 items-center justify-center rounded-brand border px-4 text-body-sm font-medium no-underline transition-colors'
          >
            Sign on
          </Link>
        </div>
      </section>

      <Section
        title='Browse by category'
        actions={
          categories.allIds.length > HOME_CATEGORY_LIMIT ? (
            <Link href={ROUTES.categories} className='text-body-sm text-brand font-medium active:opacity-70'>
              View all
            </Link>
          ) : undefined
        }
      >
        {categoryIds.length ? (
          <ul className='flex flex-wrap gap-2'>
            {categoryIds.map((categoryId) => {
              const category = categories.byId[categoryId!]
              return (
                <li key={category.id}>
                  <Link
                    href={`${ROUTES.categories}/${category.id}`}
                    className='border-brand-border text-brand-text hover:border-brand hover:bg-brand-50 active:bg-brand-100 inline-flex min-h-11 items-center rounded-brand border px-3 text-body-sm font-medium no-underline transition-colors'
                  >
                    {category.name}
                  </Link>
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
            <Link href={ROUTES.providers} className='text-body-sm text-brand font-medium active:opacity-70'>
              View all
            </Link>
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
              <Link
                href={ROUTES.accountTypeSelection}
                className='bg-brand hover:bg-brand-600 active:bg-brand-700 inline-flex min-h-11 items-center justify-center rounded-brand px-4 text-body-sm font-medium text-white no-underline transition-colors'
              >
                Sign on as a provider
              </Link>
            }
          />
        )}
      </Section>
    </PageShell>
  )
}

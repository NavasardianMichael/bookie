import { getSiteLDSchema } from '@linkedDataSchema/site'
import type { Metadata } from 'next'
import { getCategoriesListAPI } from '@api/categories/main'
import { getProvidersListAPI } from '@api/providers/main'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { EmptyState } from '@components/ui/EmptyState'
import { BuildingIcon, CalendarIcon, CheckCircleIcon, ClockIcon, SparkleIcon } from '@components/ui/icons'
import { ChipRail, Container, ResponsiveGrid, Section, Surface } from '@components/ui/layout'
import { HomeHeroPreview } from './HomeHeroPreview'
import { ProviderCard } from './providers/ProviderCard'

export const dynamic = 'force-dynamic'

const HOME_CATEGORY_LIMIT = 8
const HOME_PROVIDER_LIMIT = 6

export const metadata: Metadata = {
  description: 'Find providers and organizations on Bookie, then reserve a time that works.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.home] },
}

const FEATURES = [
  {
    key: 'calendar',
    span: 'md:col-span-2',
    tone: 'light' as const,
    icon: CalendarIcon,
    title: 'Smart calendar',
    body: 'Open hours, breaks and service duration become bookable slots. Collision-free, on every device.',
  },
  {
    key: 'booking',
    span: '',
    tone: 'brand' as const,
    icon: CheckCircleIcon,
    title: 'Book in a few taps',
    body: 'Pick a service, a day and a time. The provider confirms — no phone tag.',
  },
  {
    key: 'services',
    span: '',
    tone: 'light' as const,
    icon: ClockIcon,
    title: 'Service menus',
    body: 'Duration and price on every offering, so clients know exactly what they are booking.',
  },
  {
    key: 'categories',
    span: '',
    tone: 'light' as const,
    icon: SparkleIcon,
    title: 'Browse by specialty',
    body: 'From salons to clinics, find the right kind of provider without guessing.',
  },
  {
    key: 'orgs',
    span: '',
    tone: 'light' as const,
    icon: BuildingIcon,
    title: 'Organizations',
    body: 'Studios and clinics list under one roof, with the people who take bookings inside.',
  },
] as const

export default async function Home() {
  const [categories, providers] = await Promise.all([getCategoriesListAPI(), getProvidersListAPI()])

  const categoryIds = categories.allIds.slice(0, HOME_CATEGORY_LIMIT)
  const providerIds = providers.allIds.slice(0, HOME_PROVIDER_LIMIT)

  return (
    <div className='flex flex-col'>
      <JsonLd data={getSiteLDSchema()} />

      <section className='py-12 md:py-20 lg:py-24'>
        <Container className='flex flex-col items-center gap-12 lg:flex-row lg:gap-16'>
          <div className='flex flex-1 flex-col gap-8'>
            <div className='flex flex-col gap-4'>
              <AppParagraph size='overline' tone='brand'>
                Welcome to the future of booking
              </AppParagraph>
              <AppTitle level='h1' size='display' className='max-w-xl'>
                Scheduling, <span className='text-brand/40 italic'>simplified.</span>
              </AppTitle>
              <AppParagraph className='max-w-lg text-lg'>
                Book local services or manage your calendar with Bookie. One platform for providers and the people who
                book them.
              </AppParagraph>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
              <AppLink href={ROUTES.providers} variant='button' tone='primary' className='min-h-14 min-w-50 px-8'>
                Find a provider
              </AppLink>
              <AppLink href={ROUTES.accountTypeSelection} variant='button' className='min-h-14 min-w-50 px-8'>
                Join as a provider
              </AppLink>
            </div>
          </div>
          <div className='w-full flex-1'>
            <HomeHeroPreview />
          </div>
        </Container>
      </section>

      {!!categoryIds.length && (
        <section className='border-brand-border bg-surface border-y py-10'>
          <Container>
            <AppParagraph size='overline' className='mb-8 text-center'>
              Browse by specialty
            </AppParagraph>
            <ChipRail label='Categories' className='justify-start sm:justify-center'>
              {categoryIds.map((categoryId) => {
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
          </Container>
        </section>
      )}

      <section className='py-16 md:py-24'>
        <Container>
          <div className='mb-12 flex flex-col gap-3'>
            <AppTitle level='h2' size='h1'>
              Designed for growth
            </AppTitle>
            <AppParagraph className='text-lg'>Everything you need to manage appointments in one place.</AppParagraph>
          </div>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              const isBrand = feature.tone === 'brand'

              return (
                <Surface
                  key={feature.key}
                  padding='lg'
                  className={cn(
                    feature.span,
                    isBrand
                      ? 'bg-brand border-brand text-white transition-transform hover:scale-[1.01]'
                      : 'hover:border-brand/30 transition-colors'
                  )}
                >
                  <div
                    className={
                      isBrand
                        ? 'mb-8 flex size-12 items-center justify-center rounded-xl bg-white/20 text-white'
                        : 'bg-brand-50 text-brand mb-8 flex size-12 items-center justify-center rounded-xl'
                    }
                  >
                    <Icon className='h-6 w-6' />
                  </div>
                  <AppTitle level='h3' size='h2' className={isBrand ? 'mb-3 text-white' : 'mb-3'}>
                    {feature.title}
                  </AppTitle>
                  <p className={isBrand ? 'm-0 max-w-sm text-white/70' : 'm-0 max-w-sm'}>{feature.body}</p>
                </Surface>
              )
            })}
          </div>
        </Container>
      </section>

      <section className='pb-16 md:pb-24'>
        <Container>
          <Section
            title='Top service providers'
            actions={
              providers.allIds.length > HOME_PROVIDER_LIMIT ? (
                <AppLink href={ROUTES.providers} variant='plain' className='text-body-sm font-bold text-brand'>
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
                    Join as a provider
                  </AppLink>
                }
              />
            )}
          </Section>
        </Container>
      </section>

      <section className='bg-brand relative overflow-hidden py-24 md:py-32'>
        <div className='pointer-events-none absolute inset-0 opacity-10' aria-hidden='true'>
          <div className='absolute top-0 left-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-[100px]' />
          <div className='absolute right-0 bottom-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-white blur-[100px]' />
        </div>
        <Container className='relative z-1 flex max-w-3xl flex-col items-center gap-8 text-center'>
          <AppTitle level='h2' size='display' className='text-white'>
            Ready to reclaim your time?
          </AppTitle>
          <p className='m-0 max-w-lg text-xl leading-relaxed text-white/70'>
            Find a provider, pick a slot, and get on with your day — or run your own calendar on Bookie.
          </p>
          <div className='flex w-full flex-col justify-center gap-3 sm:flex-row'>
            <AppLink
              href={ROUTES.accountTypeSelection}
              variant='button'
              className='bg-surface text-brand hover:bg-brand-50 min-h-14 px-10 text-base'
            >
              Get started
            </AppLink>
            <AppLink
              href={ROUTES.providers}
              variant='button'
              className='min-h-14 border-white/20 bg-white/10 px-10 text-base text-white hover:bg-white/20'
            >
              Browse providers
            </AppLink>
          </div>
        </Container>
      </section>
    </div>
  )
}

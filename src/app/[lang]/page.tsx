import { getSiteLDSchema } from '@linkedDataSchema/site'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getCategoriesListAPI } from '@api/categories/main'
import { getProvidersListAPI } from '@api/providers/main'
import { currentLocale, localizedAlternates } from '@i18n/metadata'
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Home')

  return {
    description: t('metaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.home]),
  }
}

const FEATURES = [
  { key: 'calendar', span: 'md:col-span-2', tone: 'light' as const, icon: CalendarIcon },
  { key: 'booking', span: '', tone: 'brand' as const, icon: CheckCircleIcon },
  { key: 'services', span: '', tone: 'light' as const, icon: ClockIcon },
  { key: 'categories', span: '', tone: 'light' as const, icon: SparkleIcon },
  { key: 'orgs', span: '', tone: 'light' as const, icon: BuildingIcon },
] as const

export default async function Home() {
  const [categories, providers, t, tCommon] = await Promise.all([
    getCategoriesListAPI(),
    // The landing page shows a fixed handful, so it asks for exactly that many rather
    // than paging the whole directory down to `HOME_PROVIDER_LIMIT` on the client.
    getProvidersListAPI({ perPage: HOME_PROVIDER_LIMIT }),
    getTranslations('Home'),
    getTranslations('Common'),
  ])

  const categoryIds = categories.allIds.slice(0, HOME_CATEGORY_LIMIT)
  const providerIds = providers.list.allIds

  return (
    <div className='flex flex-col'>
      <JsonLd data={getSiteLDSchema(await currentLocale())} />

      <section className='py-12 md:py-20 lg:py-24'>
        <Container className='flex flex-col items-center gap-12 lg:flex-row lg:gap-16'>
          <div className='flex flex-1 flex-col gap-8'>
            <div className='flex flex-col gap-4'>
              <AppParagraph size='overline' tone='brand'>
                {t('overline')}
              </AppParagraph>
              <AppTitle level='h1' size='display' className='max-w-xl'>
                {t('titleBefore')}
                <span className='text-brand/40 italic'>{t('titleEmphasis')}</span>
              </AppTitle>
              <AppParagraph className='max-w-lg text-lg'>{t('body')}</AppParagraph>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
              <AppLink href={ROUTES.providers} variant='button' tone='primary' className='min-w-44 px-8'>
                {t('findProvider')}
              </AppLink>
              <AppLink href={ROUTES.accountTypeSelection} variant='button' className='min-w-44 px-8'>
                {t('joinAsProvider')}
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
              {t('browseSpecialty')}
            </AppParagraph>
            <ChipRail label={t('categoriesRail')} className='justify-start sm:justify-center'>
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
              {t('featuresTitle')}
            </AppTitle>
            <AppParagraph className='text-lg'>{t('featuresSubtitle')}</AppParagraph>
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
                    {t(`features.${feature.key}.title`)}
                  </AppTitle>
                  <AppParagraph tone={isBrand ? 'inverse' : 'muted'} className='m-0 max-w-sm'>
                    {t(`features.${feature.key}.body`)}
                  </AppParagraph>
                </Surface>
              )
            })}
          </div>
        </Container>
      </section>

      <section className='pb-16 md:pb-24'>
        <Container>
          <Section
            title={t('providersTitle')}
            actions={
              providers.pagination.total > HOME_PROVIDER_LIMIT ? (
                <AppLink href={ROUTES.providers} variant='plain' className='text-body-sm font-bold text-brand'>
                  {tCommon('viewAll')}
                </AppLink>
              ) : undefined
            }
          >
            {providerIds.length ? (
              <ResponsiveGrid as='ul'>
                {providerIds.map((providerId) => (
                  <li key={providerId}>
                    <ProviderCard data={providers.list.byId[providerId!]} />
                  </li>
                ))}
              </ResponsiveGrid>
            ) : (
              <EmptyState
                title={t('emptyTitle')}
                description={t('emptyBody')}
                action={
                  <AppLink href={ROUTES.accountTypeSelection} variant='button' tone='primary'>
                    {t('joinAsProvider')}
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
            {t('ctaTitle')}
          </AppTitle>
          <AppParagraph tone='inverse' className='m-0 max-w-lg text-xl leading-relaxed'>
            {t('ctaBody')}
          </AppParagraph>
          <div className='flex w-full flex-col justify-center gap-3 sm:flex-row'>
            <AppLink
              href={ROUTES.accountTypeSelection}
              variant='button'
              className='bg-surface text-brand hover:bg-brand-50 min-h-14 px-10 text-base'
            >
              {t('getStarted')}
            </AppLink>
            <AppLink
              href={ROUTES.providers}
              variant='button'
              className='min-h-14 border-white/20 bg-white/10 px-10 text-base text-white hover:bg-white/20'
            >
              {t('browseProviders')}
            </AppLink>
          </div>
        </Container>
      </section>
    </div>
  )
}

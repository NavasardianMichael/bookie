import { ProviderCard } from '@app/[lang]/providers/ProviderCard'
import { isAxiosError } from 'axios'
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getFavoriteProvidersAPI } from '@api/favorites/main'
import { GenerateMetadata } from '@interfaces/components'
import { currentLocale } from '@i18n/metadata'
import { redirect } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader, PageShell, ResponsiveGrid } from '@components/ui/layout'

export const dynamic = 'force-dynamic'

/** Private to the account, so `noindex` and no `alternates` — there is nothing to crawl. */
export const generateMetadata: GenerateMetadata<unknown> = async (): Promise<Metadata> => {
  const t = await getTranslations('Favorites')

  return {
    title: t('title'),
    robots: { index: false, follow: false },
  }
}

/**
 * A Server Component, so the cards are the same `ProviderCard`s Explore renders — server
 * markup with only the heart hydrating.
 *
 * Un-favouriting from here flips the heart and leaves the card where it is until the next
 * visit. That is deliberate: a card that vanished under the pointer could not be put back,
 * and a mis-tap would cost the visitor the provider they had saved.
 */
export default async function FavoritesPage() {
  const cookie = (await cookies()).toString()
  const t = await getTranslations('Favorites')

  let providers
  try {
    providers = await getFavoriteProvidersAPI({ cookie })
  } catch (error) {
    // `src/proxy.ts` only sees that a session cookie is present. A revoked one reaches the
    // API and 401s, and the answer to that is signing in again, not an error page.
    if (isAxiosError(error) && error.response?.status === 401) {
      redirect({ href: ROUTES.signIn, locale: await currentLocale() })
    }
    throw error
  }

  return (
    <PageShell className='flex flex-col gap-8'>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {providers.length ? (
        <ResponsiveGrid as='ul'>
          {providers.map((provider) => (
            <li key={provider.id}>
              <ProviderCard data={provider} headingLevel={2} />
            </li>
          ))}
        </ResponsiveGrid>
      ) : (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyBody')}
          action={
            <AppLink href={ROUTES.providers} variant='button' tone='primary'>
              {t('explore')}
            </AppLink>
          }
        />
      )}
    </PageShell>
  )
}

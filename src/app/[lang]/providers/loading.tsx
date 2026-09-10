import { getTranslations } from 'next-intl/server'
import { PageShell, Section } from '@components/ui/layout'
import { ProvidersResultsSkeleton } from './ProvidersResultsSkeleton'

/**
 * Mirrors the page's own layout: centred hero, the search field's control row, the
 * category rail, then the same results skeleton the `<Suspense>` boundary uses — so a
 * cold load and a re-query hand over identically.
 */
export default async function Loading() {
  const t = await getTranslations('Explore')

  return (
    <PageShell className='flex flex-col gap-10'>
      <div className='mx-auto flex w-full max-w-3xl flex-col items-center gap-6'>
        <div className='bg-surface-sunken h-10 w-full max-w-xl animate-pulse rounded-brand' />
        <div className='bg-surface-sunken h-10 w-full animate-pulse rounded-brand' />
      </div>

      <Section title={t('browseCategories')}>
        <div className='flex gap-3 overflow-hidden'>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className='bg-surface-sunken h-10 w-28 shrink-0 animate-pulse rounded-brand-sm' />
          ))}
        </div>
      </Section>

      <Section title={t('providersTitle')} className='gap-8'>
        <ProvidersResultsSkeleton />
      </Section>
    </PageShell>
  )
}

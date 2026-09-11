import { getTranslations } from 'next-intl/server'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { PageHeader, PageShell } from '@components/ui/layout'

/**
 * Rendered for every `notFound()` call under `[lang]`, and for every unmatched URL once
 * the proxy has added the locale prefix.
 *
 * **Deliberately antd-free.** This used antd's `Result`, which is one of the ~292 modules
 * antd v6 marks `"use client"` — so the heading, the body copy and both links reached the
 * DOM only after hydration. A 404 is the page most likely to be hit by a crawler
 * following a dead link and the one a user lands on with the least patience, which makes
 * it the worst page in the app to ship as an empty shell. Every element below is a bare
 * primitive that renders on the server.
 *
 * No `metadata` export: Next only honours one on `global-not-found`, and it already
 * injects `noindex` for anything answering 404.
 */
export default async function NotFound() {
  const [t, tCommon, tHome, tNav] = await Promise.all([
    getTranslations('Errors'),
    getTranslations('Common'),
    getTranslations('Home'),
    getTranslations('Nav'),
  ])

  const elsewhere = [
    { href: ROUTES.categories, label: tNav('categories') },
    { href: ROUTES.organizations, label: tNav('organizations') },
  ]

  return (
    <PageShell variant='fill' width='prose' className='justify-center'>
      <PageHeader
        align='center'
        media={
          // Decorative only — the status is carried by the heading and the HTTP code, so
          // announcing "404" again would just be noise on a screen reader.
          <p aria-hidden='true' className='text-display text-brand-300 leading-none'>
            404
          </p>
        }
        title={t('notFoundTitle')}
        subtitle={t('notFoundBody')}
        actions={
          <>
            <AppLink href={ROUTES.home} variant='button' tone='primary'>
              {tCommon('goHome')}
            </AppLink>
            <AppLink href={ROUTES.providers} variant='button'>
              {tHome('browseProviders')}
            </AppLink>
          </>
        }
      />

      <div className='mt-8 flex flex-wrap justify-center gap-2'>
        {elsewhere.map(({ href, label }) => (
          <AppLink key={href} href={href} variant='chip'>
            {label}
          </AppLink>
        ))}
      </div>
    </PageShell>
  )
}

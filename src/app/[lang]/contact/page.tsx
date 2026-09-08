import { getContactPageLDSchema } from '@linkedDataSchema/contact'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { currentLocale, localizedAlternates } from '@i18n/metadata'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { JsonLd } from '@components/ui/bare/JsonLd'
import { PageHeader, PageShell, Surface } from '@components/ui/layout'
import { ContactForm } from './ContactForm'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Contact')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await localizedAlternates(ROUTES[ROUTE_KEYS.contact]),
  }
}

/**
 * Our own copy, genuinely translated, so this is the `localizedAlternates` tier — 15
 * self-canonical variants with a full `hreflang` set. See `src/i18n/CLAUDE.md`.
 *
 * Deliberately **no `force-dynamic`**: nothing is fetched on the server here, so this page
 * needs none of the build workaround the list routes carry. It still renders on demand —
 * every `[lang]` route does, because next-intl wants `setRequestLocale` for static
 * rendering and nothing calls it (see `src/app/CLAUDE.md`) — but that is a repo-wide
 * property, not something this page opts into.
 *
 * The form is the only client island, and it is what reads the session and the profile.
 */
export default async function Contact() {
  const [locale, t] = await Promise.all([currentLocale(), getTranslations('Contact')])

  return (
    <PageShell width='prose' className='flex flex-col gap-6'>
      <JsonLd data={getContactPageLDSchema(locale)} />

      <PageHeader title={t('title')} subtitle={t('subtitle')} align='center' />

      <Surface padding='lg'>
        <ContactForm />
      </Surface>
    </PageShell>
  )
}

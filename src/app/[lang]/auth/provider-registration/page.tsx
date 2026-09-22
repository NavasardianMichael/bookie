import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageShell, Surface } from '@components/ui/layout'
import { ProviderRegistrationForm } from './ProviderRegistrationForm'
import { TermsNotice } from '../components/TermsNotice'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth.providerRegistration')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: ROUTES[ROUTE_KEYS.providerRegistration] },
  }
}

/**
 * Centred card on the sunken canvas, per
 * `design/initial prototype/provider_registration`. The heading sits above the card and the
 * consent notice inside it, matching the mockup's arrangement.
 *
 * `Surface padding='lg'` is already the prototype's card — white fill, hairline border,
 * 12px radius, `shadow-sm` — and `width='auth'` is its 480px column.
 *
 * Copy lives in `Auth.providerRegistration` so all 15 locales render the heading, not
 * hardcoded English.
 */
export default async function ProviderRegistration() {
  const tNav = await getTranslations('Nav')
  const tPage = await getTranslations('Auth.providerRegistration')

  return (
    <PageShell variant='fill' width='auth' className='justify-center'>
      <div className='flex w-full flex-col gap-8'>
        <div className='flex flex-col gap-3 text-center'>
          <AppTitle level='h1' className='text-brand'>
            {tPage('title')}
          </AppTitle>
          <AppParagraph size='body-sm' className='px-4'>
            {tPage('subtitle')}
          </AppParagraph>
        </div>

        <Surface padding='lg' className='flex flex-col gap-4'>
          <ProviderRegistrationForm />
          <TermsNotice lead={tPage('termsLead')} className='mt-2' />
        </Surface>

        <AppParagraph size='body-sm' className='text-center'>
          {tPage('alreadyHaveAccount')}{' '}
          <AppLink href={ROUTES.signIn} className='text-brand font-bold'>
            {tNav('signIn')}
          </AppLink>
        </AppParagraph>
      </div>
    </PageShell>
  )
}

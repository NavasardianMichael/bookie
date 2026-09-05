import { Metadata } from 'next'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageShell, Surface } from '@components/ui/layout'
import { ProviderRegistrationForm } from './ProviderRegistrationForm'
import { TermsNotice } from '../components/TermsNotice'

export const metadata: Metadata = {
  title: 'Create your provider account',
  description: 'Join thousands of service providers managing appointments with ease on Bookie.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.providerRegistration] },
}

/**
 * Centred card on the sunken canvas, per
 * `design/initial prototype/provider_registration`. The heading sits above the card and the
 * consent notice inside it, matching the mockup's arrangement.
 *
 * `Surface padding='lg'` is already the prototype's card — white fill, hairline border,
 * 12px radius, `shadow-sm` — and `width='auth'` is its 480px column.
 */
export default function ProviderRegistration() {
  return (
    <PageShell variant='fill' width='auth' className='justify-center'>
      <div className='flex w-full flex-col gap-8'>
        <div className='flex flex-col gap-3 text-center'>
          <AppTitle level='h1' className='text-brand'>
            Grow your business with Bookie
          </AppTitle>
          <AppParagraph size='body-sm' className='px-4'>
            Join thousands of service providers managing appointments with ease
          </AppParagraph>
        </div>

        <Surface padding='lg' className='flex flex-col gap-4'>
          <ProviderRegistrationForm />
          <TermsNotice lead='By clicking "Create Provider Account", you agree to our' className='mt-2' />
        </Surface>

        <AppParagraph size='body-sm' className='text-center'>
          Already have an account?{' '}
          <AppLink href={ROUTES.phoneNumberInput} className='text-brand font-bold'>
            Sign In
          </AppLink>
        </AppParagraph>
      </div>
    </PageShell>
  )
}

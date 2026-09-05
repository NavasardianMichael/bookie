import { Metadata } from 'next'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageShell } from '@components/ui/layout'
import { ConsumerRegistrationForm } from './ConsumerRegistrationForm'
import { RegistrationHero } from './RegistrationHero'
import { TermsNotice } from '../components/TermsNotice'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create your Bookie consumer account to start booking services.',
  alternates: { canonical: ROUTES[ROUTE_KEYS.consumerRegistration] },
}

/**
 * Two-column split, per `design/initial prototype/consumer_registration`: navy marketing
 * panel on the left, form on the right, collapsing to form-only below `lg`.
 *
 * `padded={false}` opts out of `PageShell`'s gutters so the navy panel paints to the
 * viewport edge — the one screen in the funnel that is not a centred card.
 */
export default function ConsumerRegistration() {
  return (
    <PageShell variant='fill' width='full' padded={false} className='lg:flex-row'>
      <RegistrationHero />

      <div className='flex flex-1 items-center justify-center px-6 py-12 lg:px-24'>
        <div className='flex w-full max-w-[27.5rem] flex-col'>
          <BrandLockup className='mb-10 lg:hidden' />

          <div className='mb-8 flex flex-col gap-2'>
            <AppTitle level='h1'>Get started with Bookie</AppTitle>
            <AppParagraph>Create your consumer account to start booking services.</AppParagraph>
          </div>

          <ConsumerRegistrationForm />

          <AppParagraph size='body-sm' className='mt-8 text-center'>
            Already have an account?{' '}
            <AppLink href={ROUTES.phoneNumberInput} className='text-brand font-bold'>
              Log in
            </AppLink>
          </AppParagraph>

          <TermsNotice
            lead='By signing up, you agree to our'
            className='border-brand-border-subtle mt-12 border-t pt-8'
          />
        </div>
      </div>
    </PageShell>
  )
}

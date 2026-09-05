import { Metadata } from 'next'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { AuthCard } from '@components/ui/layout'
import { SignOnForm } from './components/form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Bookie account with your phone number.',
}

/** Sign-in for a returning user. New accounts start at the account-type chooser. */
export default function PhoneNumberInput() {
  return (
    <AuthCard>
      <div className='flex flex-col gap-1'>
        <AppTitle level='h1'>Welcome back</AppTitle>
        <AppParagraph size='body-sm'>We will send a confirmation code via SMS to that number.</AppParagraph>
      </div>

      <SignOnForm />

      <AppParagraph size='body-sm' className='text-center'>
        New to Bookie?{' '}
        <AppLink href={ROUTES.accountTypeSelection} className='text-brand font-bold'>
          Create an account
        </AppLink>
      </AppParagraph>
    </AuthCard>
  )
}

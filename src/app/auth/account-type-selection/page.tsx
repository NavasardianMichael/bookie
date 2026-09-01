import { Metadata } from 'next'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { AccountTypeButtons } from './AccountTypeButtons'

export const metadata: Metadata = {
  title: 'Account Type Selection',
  description:
    'Select your account type, either Service Provider or Client (Service Consumer), to continue with the sign-on process.',
}

export default function AccountTypeSelection() {
  return (
    <div className='flex w-full flex-col gap-8'>
      <div className='flex flex-col gap-2 text-center'>
        <AppTitle level='h1'>Grow your business with Bookie</AppTitle>
        <AppParagraph>Choose who you want to sign up as.</AppParagraph>
      </div>
      <AccountTypeButtons />
    </div>
  )
}

import { Metadata } from 'next'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppTitle from '@components/ui/bare/AppTitle'
import AccountTypeButtons from './AccountTypeButtons'

export const metadata: Metadata = {
  title: 'Account Type Selection',
  description:
    'Select your account type, either Service Provider or Client (Service Consumer), to continue with the sign-on process.',
}

const AccountTypeSelection = () => (
  <div className='flex w-full flex-1 flex-col justify-between gap-6'>
    <div className='flex flex-col gap-1'>
      <AppTitle level='h1'>
        Welcome to <b>Bookie</b>
      </AppTitle>
      <AppParagraph>Choose who you want to sign up as.</AppParagraph>
    </div>
    <AccountTypeButtons />
  </div>
)

export default AccountTypeSelection

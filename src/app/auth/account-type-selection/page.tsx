import { Metadata } from 'next'
import AppBox from '@components/ui/AppBox'
import AppParagraph from '@components/ui/AppParagraph'
import AppTitle from '@components/ui/AppTitle'
import AccountTypeButtons from './AccountTypeButtons'

export const metadata: Metadata = {
  title: 'Bookie | Account Type Selection',
  description:
    'Select your account type, either Service Provider or Client (Service Consumer), to continue with the sign-on process.',
}

const AccountTypeSelection = () => {
  return (
    <AppBox className='flex w-full flex-1 flex-col justify-between gap-6'>
      <AppBox className='flex flex-col gap-1'>
        <AppTitle className='text-h1'>
          Welcome to <b>Bookie</b>
        </AppTitle>
        <AppParagraph className='text-body'>Choose who you want to sign up as.</AppParagraph>
      </AppBox>
      <AccountTypeButtons />
    </AppBox>
  )
}

export default AccountTypeSelection

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
    <AppBox className='w-full h-full grow flex flex-col justify-between gap-4'>
      <AppBox className='flex flex-col gap-2'>
        <AppTitle className='text-xl mb-0'>
          Welcome to <b>Bookie</b>
        </AppTitle>
        <AppParagraph className='text-base mb-0'>
          Choose who you want to sign up as.
        </AppParagraph>
      </AppBox>
      <AccountTypeButtons />
    </AppBox>
  )
}

export default AccountTypeSelection

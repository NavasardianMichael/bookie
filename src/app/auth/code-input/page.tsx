import { Metadata } from 'next'
import AppBox from '@components/ui/AppBox'
import AppTitle from '@components/ui/AppTitle'
import OTPCodeInput from './OTPCodeInput'

export const metadata: Metadata = {
  title: 'Bookie | OTP Code Input',
  description: 'Enter the OTP code sent to your phone.',
}

const CodeInput = () => (
  <AppBox className='w-full flex flex-col justify-center items-center gap-4'>
    <AppTitle level={'h2'} className='text-center mb-0'>
      6-digit code
    </AppTitle>
    <OTPCodeInput />
  </AppBox>
)

export default CodeInput

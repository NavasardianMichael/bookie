import { Metadata } from 'next'
import AppBox from '@components/ui/AppBox'
import AppParagraph from '@components/ui/AppParagraph'
import AppTitle from '@components/ui/AppTitle'
import OTPCodeInput from './OTPCodeInput'

export const metadata: Metadata = {
  title: 'Bookie | OTP Code Input',
  description: 'Enter the OTP code sent to your phone.',
}

const CodeInput = () => (
  <AppBox className='flex w-full flex-col gap-6'>
    <AppBox className='flex flex-col gap-1 text-center'>
      <AppTitle level='h1' className='text-h1'>
        6-digit code
      </AppTitle>
      <AppParagraph className='text-body-sm'>Enter the code we just sent you.</AppParagraph>
    </AppBox>
    <OTPCodeInput />
  </AppBox>
)

export default CodeInput

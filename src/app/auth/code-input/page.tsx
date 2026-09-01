import { Metadata } from 'next'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { OTPCodeInput } from './OTPCodeInput'

export const metadata: Metadata = {
  title: 'OTP Code Input',
  description: 'Enter the OTP code sent to your phone.',
}

export default function CodeInput() {
  return (
    <div className='flex w-full flex-col gap-6'>
      <div className='flex flex-col gap-1 text-center'>
        <AppTitle level='h1'>6-digit code</AppTitle>
        <AppParagraph size='body-sm'>Enter the code we just sent you.</AppParagraph>
      </div>
      <OTPCodeInput />
    </div>
  )
}

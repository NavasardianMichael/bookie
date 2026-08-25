import { Metadata } from 'next'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppTitle from '@components/ui/bare/AppTitle'
import SignOnForm from './components/form'

export const metadata: Metadata = {
  title: 'Sign On',
  description: 'Sign on to your Bookie account using your phone number and start the journey with Bookie now!.',
}

const PhoneNumberInput = () => (
  <div className='flex w-full flex-col gap-6'>
    <div className='flex flex-col gap-1'>
      <AppTitle level='h1'>Enter your phone number</AppTitle>
      <AppParagraph size='body-sm'>We will send a confirmation code via SMS to that number.</AppParagraph>
    </div>
    <SignOnForm />
  </div>
)

export default PhoneNumberInput

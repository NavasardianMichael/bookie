import { Metadata } from 'next'
import AppBox from '@components/ui/AppBox'
import AppParagraph from '@components/ui/AppParagraph'
import AppTitle from '@components/ui/AppTitle'
import SignOnForm from './components/form'

export const metadata: Metadata = {
  title: 'Bookie | Sign On',
  description: 'Sign on to your Bookie account using your phone number and start the journey with Bookie now!.',
}

const PhoneNumberInput = () => (
  <AppBox className='flex w-full flex-col gap-6'>
    <AppBox className='flex flex-col gap-1'>
      <AppTitle className='text-h1'>Enter your phone number</AppTitle>
      <AppParagraph className='text-body-sm'>
        We will send a confirmation code via SMS to that number.
      </AppParagraph>
    </AppBox>
    <SignOnForm />
  </AppBox>
)

export default PhoneNumberInput

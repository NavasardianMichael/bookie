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
  <AppBox className='w-full flex flex-col justify-between items-center gap-4'>
    <AppTitle className='text-xl mb-0'>Enter your phone number</AppTitle>
    <AppParagraph className='text-base mb-0'>
      We will send confirmation code via SMS to the phone number.
    </AppParagraph>
    <AppBox className='w-full justify-center items-center'>
      <AppBox className='w-full flex flex-col gap-2'>
        <SignOnForm />
      </AppBox>
    </AppBox>
  </AppBox>
)

export default PhoneNumberInput

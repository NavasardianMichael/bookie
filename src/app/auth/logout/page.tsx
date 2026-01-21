import { Metadata } from 'next'
import AppBox from '@components/ui/AppBox'
import AppButton from '@components/ui/AppButton'
import AppParagraph from '@components/ui/AppParagraph'
import AppTitle from '@components/ui/AppTitle'

export const metadata: Metadata = {
  title: 'Bookie | Log out',
  description: 'Log out from your Bookie account',
}

const Logout = () => (
  <AppBox className='w-full flex flex-col justify-center items-center m-auto max-w-160'>
    <AppBox className='flex flex-col justify-center items-center'>
      <AppTitle level={'h3'} className='text-lg mb-0'>
        We&apos;re sorry to see you go!
      </AppTitle>
      <AppParagraph className='text-center text-gray-500 mt-2 mb-4'>
        If you have any feedback or suggestions, please let us know. <br />
        Contact us at{' '}
        <a href='mailto:support.bookie@gmail.com' className='text-gray-500'>
          support.bookie@gmail.com
        </a>
      </AppParagraph>
    </AppBox>
    <hr />
    Delete Your Account
    <hr />
    <AppBox className='w-full flex flex-col justify-center items-center'>
      <AppParagraph className='text-center mt-2 mb-4 text-red-600'>
        * If you want to delete your account, please note that this action is irreversible.
        <br />
        All your data will be permanently removed from our system.
      </AppParagraph>
      <AppButton danger type='primary' variant='solid' htmlType='submit' className='mx-auto'>
        Delete Account Permanently
      </AppButton>
    </AppBox>
  </AppBox>
)

export default Logout

import { Divider } from 'antd'
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
  <AppBox className='flex w-full flex-col gap-2'>
    <AppBox className='flex flex-col gap-1 text-center'>
      <AppTitle level='h1' className='text-h2'>
        We&apos;re sorry to see you go!
      </AppTitle>
      <AppParagraph className='text-body-sm'>
        If you have any feedback or suggestions, please let us know. Contact us at{' '}
        <a href='mailto:support.bookie@gmail.com' className='underline'>
          support.bookie@gmail.com
        </a>
      </AppParagraph>
    </AppBox>

    <Divider />

    <AppBox className='flex flex-col gap-3 text-center'>
      <AppTitle level='h2' className='text-h3'>
        Delete your account
      </AppTitle>
      <AppParagraph className='text-body-sm text-red-600'>
        This action is irreversible. All your data will be permanently removed from our system.
      </AppParagraph>
      <AppButton danger type='primary' variant='solid' className='w-full'>
        Delete Account Permanently
      </AppButton>
    </AppBox>
  </AppBox>
)

export default Logout

import { Divider } from 'antd'
import { Metadata } from 'next'
import AppButton from '@components/ui/AppButton'
import AppLink from '@components/ui/bare/AppLink'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppTitle from '@components/ui/bare/AppTitle'

export const metadata: Metadata = {
  title: 'Log out',
  description: 'Log out from your Bookie account',
}

const Logout = () => (
  <div className='flex w-full flex-col gap-2'>
    <div className='flex flex-col gap-1 text-center'>
      <AppTitle level='h1' size='h2'>
        We&apos;re sorry to see you go!
      </AppTitle>
      <AppParagraph size='body-sm'>
        If you have any feedback or suggestions, please let us know. Contact us at{' '}
        <AppLink href='mailto:support.bookie@gmail.com'>support.bookie@gmail.com</AppLink>
      </AppParagraph>
    </div>

    <Divider />

    <div className='flex flex-col gap-3 text-center'>
      <AppTitle level='h2' size='h3'>
        Delete your account
      </AppTitle>
      <AppParagraph size='body-sm' tone='danger'>
        This action is irreversible. All your data will be permanently removed from our system.
      </AppParagraph>
      <AppButton danger type='primary' variant='solid' className='w-full'>
        Delete Account Permanently
      </AppButton>
    </div>
  </div>
)

export default Logout

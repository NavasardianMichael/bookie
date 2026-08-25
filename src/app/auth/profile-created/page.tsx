import { Metadata } from 'next'
import Image from 'next/image'
import profileVerifiedImage from '@assets/images/verified_icon.png'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import AppLink from '@components/ui/bare/AppLink'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppTitle from '@components/ui/bare/AppTitle'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Profile Created',
  description: 'Your profile has been successfully created!',
}

const ProfileCreated = () => (
  <div className='flex flex-1 flex-col items-center justify-center gap-4'>
    <Image priority src={profileVerifiedImage} alt='Profile Verified' width={96} />
    <div className='flex flex-col items-center gap-2'>
      <AppTitle level='h1' size='h1' className='text-center'>
        Success!
      </AppTitle>
      <AppParagraph size='body-sm' className='text-center'>
        You&apos;re all set — let&apos;s get started.
      </AppParagraph>
    </div>
    <AppLink href={ROUTES[ROUTE_KEYS.providerProfileCreation]} variant='button' tone='primary' block>
      Configure Your Profile
    </AppLink>
  </div>
)

export default ProfileCreated

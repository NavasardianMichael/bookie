import { Flex, Typography } from 'antd'
import { Metadata } from 'next'
import Image from 'next/image'
import profileVerifiedImage from '@assets/images/verified_icon.png'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import AppButton from '@components/ui/AppButton'
import AppLink from '@components/ui/AppLink'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookie | Profile Created',
  description: 'Your profile has been successfully created!',
}

const ProfileCreated = () => {
  return (
    <Flex vertical gap={16} align='center' justify='center' className='flex-1'>
      <Image priority src={profileVerifiedImage} alt='Profile Verified' width={96} />
      <Flex vertical gap={8} align='center'>
        <Typography.Title level={2} className='text-h1 text-center'>
          Success!
        </Typography.Title>
        <Typography.Paragraph type='secondary' className='text-body-sm text-center'>
          You&apos;re all set — let&apos;s get started.
        </Typography.Paragraph>
      </Flex>
      <AppLink href={ROUTES[ROUTE_KEYS.providerProfileCreation]} className='w-full no-underline'>
        <AppButton type='primary' className='w-full'>
          Configure Your Profile
        </AppButton>
      </AppLink>
    </Flex>
  )
}

export default ProfileCreated

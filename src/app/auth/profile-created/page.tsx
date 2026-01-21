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
    <Flex vertical gap={8} align='center' justify='center' className='grow h-full'>
      <Image priority src={profileVerifiedImage} alt='Profile Verified' width={100} />
      <Flex vertical gap={16}>
        <Typography.Title level={4} className='text-center mb-0!'>
          Success!
        </Typography.Title>
        <Typography.Paragraph type='secondary' className='text-center mb-0!'>
          You're all set — let's get started.
        </Typography.Paragraph>
        <AppButton type='primary'>
          <AppLink href={ROUTES[ROUTE_KEYS.providerProfileCreation]}>Configure Your Profile</AppLink>
        </AppButton>
      </Flex>
    </Flex>
  )
}

export default ProfileCreated

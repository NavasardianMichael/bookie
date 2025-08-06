import { Button, Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import Title from 'antd/es/typography/Title'
import { Metadata } from 'next'
import Image from 'next/image'
import profileVerifiedImage from '@assets/images/verified_icon.png'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'

export const metadata: Metadata = {
  title: 'Bookie | Profile Created',
  description: 'Your profile has been successfully created!',
}

const ProfileCreated: React.FC = () => {
  return (
    <Flex vertical gap={8} align='center' justify='center' className='grow h-full'>
      <Image src={profileVerifiedImage} alt='Profile Verified' width={100} height={100} />
      <Flex vertical gap={16}>
        <Title level={4} className='text-center mb-0!'>
          Success!
        </Title>
        <Paragraph type='secondary' className='text-center mb-0!'>
          You're all set — let's get started.
        </Paragraph>
        <Button type='primary'>
          <AppLink href={ROUTES[ROUTE_KEYS.providerProfileCreation]}>Configure Your Profile</AppLink>
        </Button>
      </Flex>
    </Flex>
  )
}

export default ProfileCreated

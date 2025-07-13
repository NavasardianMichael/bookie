import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import Title from 'antd/es/typography/Title'
import { Metadata } from 'next'
import Image from 'next/image'
import profileVerifiedImage from '@assets/images/verified_icon.png'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account and start the journey with Bookie',
}

const ProfileCreated: React.FC = () => {
  return (
    <Flex vertical gap={16} align='center' justify='center' className='grow h-full'>
      <Image src={profileVerifiedImage} alt='Profile Verified' width={100} height={100} />
      <div>
        <Title level={4} className='text-center mb-0!'>
          Success!
        </Title>
        <Paragraph type='secondary' className='text-center mb-0!'>
          You're all set — let's get started.
        </Paragraph>
      </div>
    </Flex>
  )
}

export default ProfileCreated

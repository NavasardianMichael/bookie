import { Flex, Typography } from 'antd'
import { Metadata } from 'next'
import ProviderProfileForm from '@components/providerProfileForm/ProviderProfileForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookie | Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

const ProfileCreation = () => (
  <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
    <Typography.Paragraph className='text-2xl! font-bold text-center mb-1!'>
      Let's Get Started!
    </Typography.Paragraph>
    <Typography.Paragraph className='text-xl! text-center mt-1!'>
      Fill in Primary Information <br /> of your Profile
    </Typography.Paragraph>
    <Flex className='w-full! justify-center items-center'>
      <Flex vertical gap={8} className='w-full'>
        <ProviderProfileForm />
      </Flex>
    </Flex>
  </Flex>
)

export default ProfileCreation

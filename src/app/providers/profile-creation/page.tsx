import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { Metadata } from 'next'
import ProviderProfileForm from '@components/providerProfileForm/ProviderProfileForm'

export const metadata: Metadata = {
  title: 'Bookie | Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

const ProfileCreation: React.FC = () => (
  <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
    <Paragraph className='text-2xl! font-bold text-center mb-1!'>Let's Get Started!</Paragraph>
    <Paragraph className='text-xl! font-bold text-center mt-1!'>
      Fill in Primary Information <br /> of your Profile
    </Paragraph>
    <Flex className='w-full! justify-center items-center'>
      <Flex vertical gap={8} className='w-full'>
        <ProviderProfileForm />
      </Flex>
    </Flex>
  </Flex>
)

export default ProfileCreation

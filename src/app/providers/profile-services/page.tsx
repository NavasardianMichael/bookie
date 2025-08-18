import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bookie | Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

const ProviderProfileServices: React.FC = () => (
  <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
    <Paragraph className='text-2xl! font-bold text-center mb-1!'>Generate your own services</Paragraph>
    <Paragraph className='text-xl! text-center mt-1!'>
      Lorem ipsum dolor sit.
    </Paragraph>
    <Flex className='w-full! justify-center items-center'>
      <Flex vertical gap={8} className='w-full'>
        SS
      </Flex>
    </Flex>
  </Flex>
)

export default ProviderProfileServices

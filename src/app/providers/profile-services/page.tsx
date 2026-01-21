import { Flex, Typography } from 'antd'
import { Metadata } from 'next'
import ProviderServices from './ProviderServices'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookie | Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

const ProviderServicesPage = () => {
  return (
    <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
      <Typography.Paragraph className='text-2xl! font-bold text-center mb-1!'>
        Generate your own services
      </Typography.Paragraph>
      <ProviderServices />
    </Flex>
  )
}

export default ProviderServicesPage

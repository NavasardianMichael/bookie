import React from 'react'
import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { Metadata } from 'next'
import ProviderServices from './ProviderServices'

export const metadata: Metadata = {
  title: 'Bookie | Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

const ProviderServicesPage: React.FC = () => {
  return (
    <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
      <Paragraph className='text-2xl! font-bold text-center mb-1!'>Generate your own services</Paragraph>
      <ProviderServices />
    </Flex>
  )
}

export default ProviderServicesPage

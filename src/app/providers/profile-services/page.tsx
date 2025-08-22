import React from 'react'
import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { Metadata } from 'next'
import ProviderProfileServices from './ProviderProfileServices'

export const metadata: Metadata = {
  title: 'Bookie | Create Your Own Profile',
  description: 'Fill in Profile Primary Info of your Profile',
}

const ProviderProfileServicesPage: React.FC = () => {
  return (
    <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
      <Paragraph className='text-2xl! font-bold text-center mb-1!'>Generate your own services</Paragraph>
      <ProviderProfileServices />
    </Flex>
  )
}

export default ProviderProfileServicesPage

import { FC } from 'react'
import { Button, Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import Title from 'antd/es/typography/Title'
import { Metadata } from 'next'
import Image from 'next/image'
import LogoIcon from '@assets/images/logo.svg'
import AccountTypeButtons from './AccountTypeButtons'

export const metadata: Metadata = {
  title: 'Bookie | Account Type Selection',
  description:
    'Select your account type, either Service Provider or Client (Service Consumer), to continue with the sign-on process.',
}

const AccountTypeSelection: FC = () => {
  return (
    <Flex vertical justify='space-between' className='w-full h-full grow!' gap={16}>
      <Flex vertical gap={8}>
        <Title className='text-xl! mb-0!'>
          Welcome to <b>Bookie</b>
        </Title>
        <Paragraph type='secondary' className='text-base! mb-0!'>
          Choose who you want to sign up as.
        </Paragraph>
        <AccountTypeButtons />
      </Flex>

      <Image src={LogoIcon} alt='Bookie logo' width={300} height={400} className='mx-auto' />

      <Flex vertical gap={8}>
        <Paragraph type='secondary' className='text-base! text-center'>
          Quick access — sign in with your phone number to get started.
        </Paragraph>
        <Button type='primary' className='py-6!'>
          Sign on
        </Button>
      </Flex>
    </Flex>
  )
}

export default AccountTypeSelection

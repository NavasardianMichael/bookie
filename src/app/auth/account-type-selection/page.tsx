import { Flex, Typography } from 'antd'
import { Metadata } from 'next'
import AccountTypeButtons from './AccountTypeButtons'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookie | Account Type Selection',
  description:
    'Select your account type, either Service Provider or Client (Service Consumer), to continue with the sign-on process.',
}

const AccountTypeSelection = () => {
  return (
    <Flex vertical justify='space-between' className='w-full h-full grow!' gap={16}>
      <Flex vertical gap={8}>
        <Typography.Title className='text-xl! mb-0!'>
          Welcome to <b>Bookie</b>
        </Typography.Title>
        <Typography.Paragraph type='secondary' className='text-base! mb-0!'>
          Choose who you want to sign up as.
        </Typography.Paragraph>
      </Flex>
      <AccountTypeButtons />
    </Flex>
  )
}

export default AccountTypeSelection

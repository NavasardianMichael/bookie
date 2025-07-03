import { FC } from 'react'
import { Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { Metadata } from 'next'
import AccountTypeButtons from './AccountTypeButtons'

export const metadata: Metadata = {
  title: 'Bookie | Account Type Selection',
  description: 'Select your account type, either Provider or Consumer, to continue with the sign-on process.',
}

const AccountTypeSelection: FC = () => {
  return (
    <Flex className="w-full flex flex-col justify-center items-center m-auto! max-w-160">
      <Paragraph>Continue as</Paragraph>
      <AccountTypeButtons />
    </Flex>
  )
}

export default AccountTypeSelection

import { Flex } from 'antd'
import { Metadata } from 'next'
import AppLink from '@components/shared/AppLink'

export const metadata: Metadata = {
  title: 'Bookie | Select Account Type',
  description: 'Select the type of account you want to create on Bookie - Provider or Consumer',
}

const AccountTypeSelection: React.FC = () => (
  <Flex className="w-full flex flex-col justify-center items-center m-auto! max-w-160">
    <AppLink href="/auth/accountTypeSelection">Provider</AppLink>
    <AppLink as="button" href="/auth/accountTypeSelection">
      Consumer
    </AppLink>
  </Flex>
)

export default AccountTypeSelection

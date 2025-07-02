import { Flex } from 'antd'
import { Metadata } from 'next'
import SignOnForm from './components/form'

export const metadata: Metadata = {
  title: 'Bookie | Sign On',
  description: 'Sign on to your Bookie account using your phone number and start the journey with Bookie now!.',
}

const PhoneNumberInput: React.FC = () => (
  <Flex className="w-full justify-center items-center my-auto!">
    <SignOnForm />
  </Flex>
)

export default PhoneNumberInput

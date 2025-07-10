import { Flex } from 'antd'
import { Metadata } from 'next'
import SignOnForm from './components/form'
import Title from 'antd/es/typography/Title'
import Paragraph from 'antd/es/typography/Paragraph'

export const metadata: Metadata = {
  title: 'Bookie | Sign On',
  description: 'Sign on to your Bookie account using your phone number and start the journey with Bookie now!.',
}

const PhoneNumberInput: React.FC = () => (
  <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
    <Title className='text-xl! mb-0!'>Enter your phone number</Title>
    <Paragraph type='secondary' className='text-base! mb-0!'>
      We will send confirmation code via SMS to the phone number.
    </Paragraph>
    <Flex className='w-full! justify-center items-center'>
      <Flex vertical gap={8} className='w-full'>
        <SignOnForm />
      </Flex>
    </Flex>
  </Flex>
)

export default PhoneNumberInput

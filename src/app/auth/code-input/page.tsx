import { Flex, Typography } from 'antd'
import { Metadata } from 'next'
import OTPCodeInput from './OTPCodeInput'

export const metadata: Metadata = {
  title: 'Bookie | OTP Code Input',
  description: 'Enter the OTP code sent to your phone.',
}

const CodeInput = () => (
  <Flex vertical align='center' justify='center' className='w-full flex flex-col' gap={16}>
    <Typography.Title level={2} className='text-center mb-0!'>
      6-digit code
    </Typography.Title>
    <OTPCodeInput />
  </Flex>
)

export default CodeInput

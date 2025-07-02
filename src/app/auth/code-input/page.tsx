import { Flex, Typography } from 'antd'
import OTP from 'antd/es/input/OTP'
import { Metadata } from 'next'
import OTPCodeInput from './OTPCodeInput'

export const metadata: Metadata = {
  title: 'Bookie | OTP Code Input',
  description: 'Enter the OTP code sent to your phone.',
}

const CodeInput: React.FC = () => (
  <Flex>
    <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>
      Enter OTP Code
    </Typography.Title>
    <OTPCodeInput />
    <OTP />
  </Flex>
)

export default CodeInput

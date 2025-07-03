import { Flex } from 'antd'
import Title from 'antd/es/typography/Title'
import { Metadata } from 'next'
import OTPCodeInput from './OTPCodeInput'

export const metadata: Metadata = {
  title: 'Bookie | OTP Code Input',
  description: 'Enter the OTP code sent to your phone.',
}

const CodeInput: React.FC = () => (
  <Flex
    vertical
    align="center"
    justify="center"
    className='className="w-full flex flex-col justify-center items-center m-auto! max-w-160"'
  >
    <Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>
      Enter OTP Code
    </Title>
    <OTPCodeInput />
  </Flex>
)

export default CodeInput

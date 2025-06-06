import { Flex } from 'antd'
import { Metadata } from 'next'
import SignUpForm from './components/form'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account and start the journey with Bookie',
}

const App: React.FC = () => (
  <Flex className="w-full justify-center items-center my-auto!">
    <SignUpForm />
  </Flex>
)

export default App

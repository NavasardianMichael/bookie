import { Flex } from 'antd';
import LoginForm from './form';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Log In',
    description: 'Sign in to your account and start the journey with Bookie'
}

const App: React.FC = () => (
    <Flex className='w-full justify-center items-center'>
        <LoginForm />
    </Flex>
);

export default App;
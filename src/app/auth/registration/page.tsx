import { Flex } from 'antd';
import RegistrationForm from './form';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Register',
    description: 'Create a new account and start the journey with Bookie'
}

const App: React.FC = () => (
    <Flex className='w-full justify-center items-center'>
        <RegistrationForm />
    </Flex>
);

export default App;
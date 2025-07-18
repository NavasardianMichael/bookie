import { Button, Divider, Flex } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import Title from 'antd/es/typography/Title'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bookie | Log out',
  description: 'Log out from your Bookie account',
}

const Logout: React.FC = () => (
  <Flex className='w-full flex flex-col justify-center items-center m-auto! max-w-160'>
    <Flex className='flex flex-col justify-center items-center'>
      <Title level={3} className='text-lg mb-0'>
        We&apos;re sorry to see you go!
      </Title>
      <Paragraph className='text-center text-gray-500 mt-2 mb-4'>
        If you have any feedback or suggestions, please let us know. <br />
        Contact us at{' '}
        <a href='mailto:support.bookie@gmail.com' className='text-gray-500!'>
          support.bookie@gmail.com
        </a>
      </Paragraph>
    </Flex>
    <Divider>Delete Your Account</Divider>
    <Flex className='w-full flex flex-col justify-center items-center'>
      <Paragraph type='danger' className='text-center mt-2 mb-4'>
        * If you want to delete your account, please note that this action is irreversible.
        <br />
        All your data will be permanently removed from our system.
      </Paragraph>
      <Button danger type='primary' variant='solid' htmlType='submit' className='mx-auto'>
        Delete Account Permanently
      </Button>
    </Flex>
  </Flex>
)

export default Logout

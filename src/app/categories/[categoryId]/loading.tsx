import { Spin } from 'antd'

const Loading = () => {
  return (
    <div className='p-6 flex justify-center items-center min-h-96'>
      <Spin size='large' />
    </div>
  )
}

export default Loading

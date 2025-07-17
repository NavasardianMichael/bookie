import React from 'react'
import { Spin } from 'antd'

const Loading = () => {
  return (
    <div className='w-full flex items-center justify-center h-screen'>
      <Spin size='large' />
    </div>
  )
}

export default Loading

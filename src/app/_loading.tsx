import React from 'react'
import { Spin } from 'antd'

const Loading = () => {
  return (
    <div className='h-full flex items-center justify-center grow'>
      <Spin size='large' />
    </div>
  )
}

export default Loading

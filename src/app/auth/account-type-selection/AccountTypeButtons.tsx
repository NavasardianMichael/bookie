'use client'

import { ROUTES } from '@constants/routes'
import { Button, Col, Row } from 'antd'
import { useRouter } from 'next/navigation'
import { MouseEventHandler } from 'react'

const AccountTypeButtons: React.FC = () => {
  const { replace } = useRouter()
  const handleAccountTypeClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    const { name } = event.currentTarget
    localStorage.setItem('accountType', name)
    replace(ROUTES.phoneNumberInput)
  }

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Button type='primary' onClick={handleAccountTypeClick} name='consumer' className='w-full py-[24px]!'>
          Client
        </Button>
      </Col>
      <Col span={12}>
        <Button onClick={handleAccountTypeClick} name='provider' className='w-full py-[24px]!'>
          Service Provider
        </Button>
      </Col>
    </Row>
  )
}

export default AccountTypeButtons

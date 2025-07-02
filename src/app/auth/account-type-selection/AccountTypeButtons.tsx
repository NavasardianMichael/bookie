'use client'

import { MouseEventHandler } from 'react'
import { Button, Flex } from 'antd'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@constants/routes'

const AccountTypeButtons: React.FC = () => {
  const { replace } = useRouter()
  const handleAccountTypeClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    const { name } = event.currentTarget
    localStorage.setItem('accountType', name)
    replace(ROUTES.phoneNumberInput)
  }

  return (
    <Flex wrap="wrap" justify="center" gap={8}>
      <Button type="dashed" onClick={handleAccountTypeClick} name="provider">
        Provider
      </Button>
      <Button type="dashed" onClick={handleAccountTypeClick} name="consumer">
        Consumer
      </Button>
    </Flex>
  )
}

export default AccountTypeButtons

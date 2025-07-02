'use client'

import { MouseEventHandler, useMemo, useRef, useState } from 'react'
import { Button, Flex, Form, FormItemProps, Input, Statistic } from 'antd'
import { OTPProps } from 'antd/es/input/OTP'
import { useAuthStore } from '@store/auth/store'

const { Countdown } = Statistic

const OTPCodeInput: React.FC = () => {
  const { getCodeByPhoneNumber, validatePhoneNumberCode, error, isPending, setAuthState } = useAuthStore()
  const [code, setCode] = useState<number | undefined>()
  const [showResendButton, setShowResendButton] = useState(false)
  const onFinish = () => setShowResendButton(true)
  const phoneNumberRef = useRef(localStorage.getItem('phoneNumber'))
  const countDownDeadlineRef = useRef(Date.now() + 60 * 1000)

  const onOTPCodeSubmit: OTPProps['onSubmit'] = () => {
    if (!phoneNumberRef.current) {
      console.error('Phone number not found in local storage.')
      return
    }
    if (!code) {
      console.error('Invalid OTP code.')
      return
    }
    validatePhoneNumberCode({
      code,
      phoneNumber: phoneNumberRef.current,
    })
  }

  const onOTPCodeChange: OTPProps['onChange'] = (value) => {
    setCode(+value)
  }

  const onResendButtonClick: MouseEventHandler<HTMLElement> = () => {
    const phoneNumber = localStorage.getItem('phoneNumber')
    if (!phoneNumber) {
      console.error('Phone number not found in local storage.')
      return
    }
    getCodeByPhoneNumber({ phoneNumber })
  }

  const OTPCodeValidationRules: FormItemProps['rules'] = useMemo(() => {
    return [
      {
        validateTrigger: 'onChange',
        validator: () => {
          if (!error) return Promise.resolve()
          setCode(undefined)
          setAuthState({ error: null })
          return Promise.reject(error.message)
        },
      },
    ]
  }, [error])

  return (
    <Flex>
      <Form.Item rules={OTPCodeValidationRules}>
        <Input.OTP onSubmit={onOTPCodeSubmit} onChange={onOTPCodeChange} disabled={isPending} />
      </Form.Item>
      {showResendButton ? (
        <Button onClick={onResendButtonClick}>Resend Code</Button>
      ) : (
        <Countdown value={countDownDeadlineRef.current} onFinish={onFinish} />
      )}
    </Flex>
  )
}

export default OTPCodeInput

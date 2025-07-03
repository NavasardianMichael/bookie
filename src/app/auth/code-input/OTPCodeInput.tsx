'use client'

import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Flex, Form, FormItemProps, Input, Statistic } from 'antd'
import { OTPProps } from 'antd/es/input/OTP'
import { useAuthStore } from '@store/auth/store'

const { Countdown } = Statistic

const COUNTDOWN_DURATION = 5_000

const OTPCodeInput: React.FC = () => {
  const { getCodeByPhoneNumber, validatePhoneNumberCode, error, isPending, setAuthState } = useAuthStore()
  const [code, setCode] = useState<string>('')
  const [showResendButton, setShowResendButton] = useState(false)
  const onFinish = () => setShowResendButton(true)
  const phoneNumberRef = useRef<string | undefined>(undefined)
  const [countDownDeadline, setCountDownDeadline] = useState(Date.now() + COUNTDOWN_DURATION)

  useEffect(() => {
    phoneNumberRef.current = localStorage.getItem('phoneNumber')!
  }, [])

  const onOTPCodeSubmit: OTPProps['onSubmit'] = () => {}

  const onOTPCodeChange: OTPProps['onChange'] = (value) => {
    if (!phoneNumberRef.current) {
      console.error('Phone number not found in local storage.')
      return
    }
    if (!value) {
      console.error('Invalid OTP code.')
      return
    }
    validatePhoneNumberCode({
      code: +value,
      phoneNumber: phoneNumberRef.current,
    })

    setCode(value)
  }

  const onResendButtonClick: MouseEventHandler<HTMLElement> = () => {
    const phoneNumber = localStorage.getItem('phoneNumber')
    if (!phoneNumber) {
      console.error('Phone number not found in local storage.')
      return
    }
    getCodeByPhoneNumber({ phoneNumber })
    setCode('')
    setShowResendButton(false)
    setCountDownDeadline(Date.now() + COUNTDOWN_DURATION)
  }

  const OTPCodeValidationRules: FormItemProps['rules'] = useMemo(() => {
    return [
      {
        validateTrigger: 'onChange',
        validator: () => {
          if (!error) return Promise.resolve()
          setCode('')
          setAuthState({ error: null })
          return Promise.reject(error.message)
        },
      },
    ]
  }, [error])

  return (
    <Flex vertical align="center" justify="center" gap={8}>
      <Form.Item rules={OTPCodeValidationRules}>
        <Input.OTP
          onSubmit={onOTPCodeSubmit}
          onChange={onOTPCodeChange}
          disabled={isPending}
          value={code?.toString()}
        />
      </Form.Item>
      <div style={{ height: 40 }}>
        {showResendButton ? (
          <Button onClick={onResendButtonClick}>Resend Code</Button>
        ) : (
          <Countdown value={countDownDeadline} onFinish={onFinish} />
        )}
      </div>
    </Flex>
  )
}

export default OTPCodeInput

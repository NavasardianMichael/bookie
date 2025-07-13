'use client'

import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { Button, CountdownProps, Flex, Form, FormItemProps, Input, Statistic } from 'antd'
import { OTPProps } from 'antd/es/input/OTP'
import { useAuthStore } from '@store/auth/store'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@constants/routes'
import Paragraph from 'antd/es/typography/Paragraph'

const { Countdown } = Statistic

const COUNTDOWN_DURATION = 5_000

const OTPCodeInput: React.FC = () => {
  const { replace } = useRouter()
  const { getCodeByPhoneNumber, validatePhoneNumberCode, error, isPending, setAuthState } = useAuthStore()
  const [code, setCode] = useState<string>('')
  const [showResendButton, setShowResendButton] = useState(false)
  const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_DURATION)
  const onFinish = () => {
    setShowResendButton(true)
    setCountdownValue(COUNTDOWN_DURATION)
  }
  const phoneNumberRef = useRef<string | undefined>(undefined)
  const [countDownDeadline, setCountDownDeadline] = useState(Date.now() + COUNTDOWN_DURATION)

  useEffect(() => {
    phoneNumberRef.current = localStorage.getItem('phoneNumber')!
  }, [])

  const onOTPCodeSubmit: OTPProps['onSubmit'] = () => {}

  const onOTPCodeChange: OTPProps['onChange'] = async (value) => {
    if (!phoneNumberRef.current) {
      console.error('Phone number not found in local storage.')
      return
    }
    if (!value) {
      console.error('Invalid OTP code.')
      return
    }

    try {
      setCode(value)
      await validatePhoneNumberCode({
        code: +value,
        phoneNumber: phoneNumberRef.current,
      })
      replace(ROUTES.profileCreated)
    } catch (err) {
      console.error('Error validating OTP code:', err)
      setAuthState({ error: err as Error })
      setCode('')
      setShowResendButton(true)
    }
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
  console.log({ countDownDeadline })

  const onCountdownChange: CountdownProps['onChange'] = (value) => {
    setCountdownValue(+value!)
  }
  if (countdownValue <= 0) {
    console.log({ countdownValue })
  }

  return (
    <>
      <Paragraph type='secondary' className='text-center mb-0!'>
        Please confirm code sent to your {phoneNumberRef.current} phone number.
      </Paragraph>
      <Flex vertical align='center' justify='center' gap={8}>
        <Form.Item rules={OTPCodeValidationRules}>
          <Input.OTP
            onSubmit={onOTPCodeSubmit}
            onChange={onOTPCodeChange}
            disabled={isPending || showResendButton || countdownValue <= 0}
            value={code?.toString()}
          />
        </Form.Item>

        <Button
          onClick={onResendButtonClick}
          className='relative w-full h-[56px]!'
          size='large'
          disabled={isPending || !showResendButton}
        >
          Resend Code
          {countdownValue > 0 && (
            <Countdown
              value={countDownDeadline}
              onFinish={onFinish}
              onChange={onCountdownChange}
              className='text-xs! absolute right-[6px]'
              style={{ fontSize: 6 }}
              format='ss'
            />
          )}
        </Button>
      </Flex>
    </>
  )
}

export default OTPCodeInput

'use client'

import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { Button, CountdownProps, Flex, Form, FormItemProps, Input, Statistic } from 'antd'
import { OTPProps } from 'antd/es/input/OTP'
import Paragraph from 'antd/es/typography/Paragraph'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth/store'
import { ROUTES } from '@constants/routes'
import { combineClassNames } from '@helpers/commons'
import styles from './countdown.module.css'

const { Timer } = Statistic

const COUNTDOWN_DURATION = 3_000

const OTPCodeInput: React.FC = () => {
  const { replace } = useRouter()
  const { getCodeByPhoneNumber, validatePhoneNumberCode, error, isPending, setAuthState } = useAuthStore()
  const [code, setCode] = useState<string>('')
  const [showResendButton, setShowResendButton] = useState(false)
  const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_DURATION)
  const onFinish = () => {
    setShowResendButton(true)
  }
  const phoneNumberRef = useRef<string | undefined>(undefined)
  const [countDownDeadline, setCountDownDeadline] = useState(Date.now() + COUNTDOWN_DURATION)

  useEffect(() => {
    phoneNumberRef.current = `+${localStorage.getItem('countryCode')!}${localStorage.getItem('phoneNumber')!}`
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
        otp: value,
        phoneNumber: phoneNumberRef.current,
      })
      replace(ROUTES.profileCreated)
    } catch (err) {
      console.error('Error validating OTP code:', err)
      setAuthState({ error: err as Error })
      setCode('')
      setShowResendButton(true)
      // ERROR HANDLING
      replace(ROUTES.profileCreated)
    }
  }

  const onResendButtonClick: MouseEventHandler<HTMLElement> = async () => {
    const phoneNumber = localStorage.getItem('phoneNumber')
    if (!phoneNumber) {
      console.error('Phone number not found in local storage.')
      return
    }
    setCode('')
    setCountdownValue(Date.now() + COUNTDOWN_DURATION)
    await getCodeByPhoneNumber({ phoneNumber })
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
  }, [error, setAuthState])

  const onCountdownChange: CountdownProps['onChange'] = (value) => {
    setCountdownValue(+value!)
  }

  return (
    <>
      <Paragraph type='secondary' className='text-center mb-0!'>
        Please confirm code sent to your <strong>{phoneNumberRef.current}</strong> phone number.
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
          type='primary'
          disabled={isPending || !showResendButton}
        >
          Resend Code
          {countdownValue > 0 && (
            <Timer
              type='countdown'
              value={countDownDeadline}
              onFinish={onFinish}
              onChange={onCountdownChange}
              className={combineClassNames('absolute right-[6px]', styles.countdown)}
              format='mm:ss'
              loading={isPending}
            />
          )}
        </Button>
      </Flex>
    </>
  )
}

export default OTPCodeInput

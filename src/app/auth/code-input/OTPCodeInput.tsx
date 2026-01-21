'use client'

import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { CountdownProps, Flex, Form, FormItemProps, Input, Statistic, Typography } from 'antd'
import type { OTPProps } from 'antd/es/input/OTP'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth/store'
import { PhoneNumber } from '@interfaces/app'
import { ROUTES } from '@constants/routes'
import { combineClassNames } from '@helpers/commons'
import { processError } from '@helpers/error'
import { LOCAL_STORAGE_KEYS } from '@helpers/localStorage'
import AppButton from '@components/ui/AppButton'
import styles from './countdown.module.css'

const { Timer } = Statistic

const COUNTDOWN_DURATION = 60_000

const OTPCodeInput: React.FC = () => {
  const { replace, push } = useRouter()
  const { getCodeByPhoneNumber, validatePhoneNumberCode, error, isPending, setAuthState } = useAuthStore()
  const [code, setCode] = useState<string>('')
  const [showResendButton, setShowResendButton] = useState(false)
  const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_DURATION)
  const [countDownDeadline, setCountDownDeadline] = useState(Date.now() + COUNTDOWN_DURATION)
  const phoneNumberRef = useRef<PhoneNumber['number'] | null>(null)
  const countryCodeRef = useRef<PhoneNumber['code'] | null>(null)
  const phoneNumberDisplayFormatRef = useRef<string>('')

  useEffect(() => {
    phoneNumberRef.current = +localStorage.getItem(LOCAL_STORAGE_KEYS.phoneNumber)!
  }, [])
  useEffect(() => {
    countryCodeRef.current = +localStorage.getItem(LOCAL_STORAGE_KEYS.countryCode)!
  }, [])
  useEffect(() => {
    phoneNumberDisplayFormatRef.current = `+${countryCodeRef.current} ${phoneNumberRef.current}`
  }, [])

  const validatePhoneNumberValues = () => {
    if (
      !phoneNumberRef.current ||
      !countryCodeRef.current ||
      isNaN(+phoneNumberRef.current) ||
      isNaN(+countryCodeRef.current)
    ) {
      console.error(
        'Form some reason phone number or country code was not found in the store to proceed OTP verification process.'
      )
      push(ROUTES.phoneNumberInput)
    }
  }

  const onFinish = () => setShowResendButton(true)

  const onOTPCodeSubmit: OTPProps['onSubmit'] = () => {}

  const onOTPCodeChange: OTPProps['onChange'] = async (value) => {
    if (!value) {
      console.error('Invalid OTP code.')
      return
    }

    validatePhoneNumberValues()

    try {
      setCode(value)

      await validatePhoneNumberCode({
        otp: +value,
        phone: {
          number: phoneNumberRef.current!,
          code: countryCodeRef.current!,
        },
      })

      replace(ROUTES.profileCreated)
    } catch (err) {
      console.error('Error validating OTP code:', err)
      const error = processError(err)
      setAuthState({ error })
      setCode('')
      setShowResendButton(true)
      replace(ROUTES.profileCreated)
    }
  }

  const onResendButtonClick: MouseEventHandler<HTMLElement> = async () => {
    validatePhoneNumberValues()
    await getCodeByPhoneNumber({
      phone: {
        code: phoneNumberRef.current!,
        number: countryCodeRef.current!,
      },
    })
    setCode('')
    setCountdownValue(Date.now() + COUNTDOWN_DURATION)
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
      <Typography.Paragraph type='secondary' className='text-center mb-0!'>
        Please confirm code sent to your phone number
        <br />
        <strong>{phoneNumberDisplayFormatRef.current}</strong>
      </Typography.Paragraph>
      <Flex vertical align='center' justify='center' gap={8}>
        <Form.Item rules={OTPCodeValidationRules}>
          <Input.OTP
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onSubmit={onOTPCodeSubmit}
            onChange={onOTPCodeChange}
            disabled={isPending || showResendButton || countdownValue <= 0}
            value={code?.toString()}
          />
        </Form.Item>

        <AppButton
          onClick={onResendButtonClick}
          className='relative w-full h-[56px]!'
          type='primary'
          disabled={isPending || !showResendButton}
          loading={isPending}
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
        </AppButton>
      </Flex>
    </>
  )
}

export default OTPCodeInput

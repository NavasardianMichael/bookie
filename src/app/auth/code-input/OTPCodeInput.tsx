'use client'

import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { CountdownProps, Flex, Form, FormItemProps, Input, Typography } from 'antd'
import type { OTPProps } from 'antd/es/input/OTP'
import Countdown from 'antd/es/statistic/Countdown'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth/store'
import { PhoneNumber } from '@interfaces/app'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { processError } from '@helpers/error'
import { LOCAL_STORAGE_KEYS } from '@helpers/localStorage'
import AppButton from '@components/ui/AppButton'
import styles from './countdown.module.css'

const COUNTDOWN_DURATION = 60_000

const OTPCodeInput: React.FC = () => {
  const { replace, push } = useRouter()
  const { getCodeByPhoneNumber, validatePhoneNumberCode, error, isPending, setAuthState } = useAuthStore()
  const [code, setCode] = useState<string>('')
  const [showResendButton, setShowResendButton] = useState(false)
  const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_DURATION)
  const [countDownDeadline, setCountDownDeadline] = useState(0)
  const [phoneNumberDisplayFormat, setPhoneNumberDisplayFormat] = useState('')
  const phoneNumberRef = useRef<PhoneNumber['number'] | null>(null)
  const countryCodeRef = useRef<PhoneNumber['code'] | null>(null)

  useEffect(() => {
    const phoneNumber = +localStorage.getItem(LOCAL_STORAGE_KEYS.phoneNumber)!
    const countryCode = +localStorage.getItem(LOCAL_STORAGE_KEYS.countryCode)!
    phoneNumberRef.current = phoneNumber
    countryCodeRef.current = countryCode
    // Hydrate client-only values after mount; localStorage is not available during SSR.
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage snapshot on mount */
    setPhoneNumberDisplayFormat(`+${countryCode} ${phoneNumber}`)
    setCountDownDeadline(Date.now() + COUNTDOWN_DURATION)
    /* eslint-enable react-hooks/set-state-in-effect */
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

      const accountType =
        (localStorage.getItem(LOCAL_STORAGE_KEYS.accountType) as typeof USER_TYPES.consumer | null) ??
        USER_TYPES.consumer

      await validatePhoneNumberCode({
        otp: +value,
        userType: accountType,
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
      <Typography.Paragraph type='secondary' className='mb-0 text-center'>
        Please confirm code sent to your phone number
        <br />
        <strong>{phoneNumberDisplayFormat}</strong>
      </Typography.Paragraph>
      <Flex vertical align='center' justify='center' gap={8} className='w-full'>
        <Form.Item rules={OTPCodeValidationRules} className='mb-0 w-full'>
          <Input.OTP
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            size='large'
            className='w-full'
            classNames={{ input: 'min-w-0 flex-1 aspect-square' }}
            inputMode='numeric'
            autoComplete='one-time-code'
            onSubmit={onOTPCodeSubmit}
            onChange={onOTPCodeChange}
            disabled={isPending || showResendButton || countdownValue <= 0}
            value={code?.toString()}
          />
        </Form.Item>

        {countdownValue > 0 && (
          <Countdown
            value={countDownDeadline}
            onFinish={onFinish}
            onChange={onCountdownChange}
            className={cn(styles.countdown)}
            format='mm:ss'
          />
        )}

        <AppButton
          onClick={onResendButtonClick}
          className='w-full'
          type='primary'
          disabled={isPending || !showResendButton}
          loading={isPending}
        >
          Resend Code
        </AppButton>
      </Flex>
    </>
  )
}

export default OTPCodeInput

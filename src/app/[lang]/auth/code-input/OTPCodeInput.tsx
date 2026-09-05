'use client'

import { MouseEventHandler, useEffect, useState } from 'react'
import { Alert, CountdownProps, Flex, Input, Typography } from 'antd'
import type { OTPProps } from 'antd/es/input/OTP'
import Countdown from 'antd/es/statistic/Countdown'
import { useAuthStore } from '@store/auth/store'
import { PendingSignOn } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { generateEntityPath } from '@helpers/entities'
import { processError } from '@helpers/error'
import { clearPendingSignOn, readPendingSignOn } from '@helpers/localStorage'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { AppButton } from '@components/ui/AppButton'
import styles from './countdown.module.css'

const COUNTDOWN_DURATION = 60_000
const OTP_LENGTH = 6
const OTP_LABEL_ID = 'otp-code-label'

/**
 * The OTP step, shared by registration and sign-in.
 *
 * Three defects this screen used to have, each of which let the funnel lie to the user:
 * success and failure both navigated to the success screen, so a wrong code "worked"; the
 * validation rules sat on a nameless `Form.Item` outside any `<Form>`, so they never ran and
 * the server's error was never rendered; and resend passed the phone number as the country
 * code and vice versa.
 *
 * There is no `<Form>` here on purpose — a single auto-submitting input has no form state
 * worth owning, so the error is rendered directly instead of through rules that cannot fire.
 *
 * Where it goes next comes from the login response: `role` picks consumer versus provider
 * onboarding, and `isNewUser` keeps a returning sign-in away from the "profile created"
 * screen.
 */
export const OTPCodeInput: React.FC = () => {
  const { replace } = useRouter()
  const getCodeByPhoneNumber = useAuthStore.use.getCodeByPhoneNumber()
  const validatePhoneNumberCode = useAuthStore.use.validatePhoneNumberCode()
  const isPending = useAuthStore.use.isPending()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showResendButton, setShowResendButton] = useState(false)
  const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_DURATION)
  const [countDownDeadline, setCountDownDeadline] = useState(0)
  const [pending, setPending] = useState<PendingSignOn | null>(null)

  useEffect(() => {
    const stored = readPendingSignOn()

    // Reaching this screen with nothing pending means a deep link or cleared storage: there
    // is no number to verify against, so send them back to enter one.
    if (!stored) {
      replace(ROUTES.phoneNumberInput)
      return
    }

    /* eslint-disable react-hooks/set-state-in-effect -- localStorage snapshot on mount */
    setPending(stored)
    setCountDownDeadline(Date.now() + COUNTDOWN_DURATION)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [replace])

  const onOTPCodeChange: OTPProps['onChange'] = async (value) => {
    if (!pending || value.length < OTP_LENGTH) return

    setCode(value)
    setError(null)

    try {
      const result = await validatePhoneNumberCode({
        otp: Number(value),
        phone: pending.phone,
        userType: pending.registration?.userType,
        profile: pending.registration?.profile,
      })

      clearPendingSignOn()

      // A returning user already has an account, so the success screen would be a lie.
      if (!result.isNewUser) {
        replace(
          result.role === USER_TYPES.provider
            ? generateEntityPath(ROUTE_KEYS.providers, result.profileId)
            : ROUTES.providers
        )
        return
      }

      replace(ROUTES.profileCreated)
    } catch (err) {
      // Stay put. Navigating here is what made a rejected code indistinguishable from an
      // accepted one.
      setError(processError(err).message)
      setCode('')
    }
  }

  const onResendButtonClick: MouseEventHandler<HTMLElement> = async () => {
    if (!pending) return

    setError(null)
    try {
      await getCodeByPhoneNumber({ phone: pending.phone })
      setCode('')
      setCountdownValue(COUNTDOWN_DURATION)
      setShowResendButton(false)
      setCountDownDeadline(Date.now() + COUNTDOWN_DURATION)
    } catch (err) {
      setError(processError(err).message)
    }
  }

  const onCountdownChange: CountdownProps['onChange'] = (value) => {
    setCountdownValue(Number(value ?? 0))
  }

  return (
    <>
      <Typography.Paragraph type='secondary' className='mb-0 text-center'>
        Please confirm code sent to your phone number
        <br />
        <strong>{pending ? generateFriendlyPhoneNumber(pending.phone, { prefix: '+', delimiter: ' ' }) : ''}</strong>
      </Typography.Paragraph>

      <Flex vertical align='center' justify='center' gap={8} className='w-full'>
        {error && (
          <Alert type='error' showIcon message={error} className='w-full' role='alert' aria-live='assertive' />
        )}

        {/* `Input.OTP` renders six inputs inside a `role="group"` wrapper, so it is named
            with `aria-labelledby` — a `<label htmlFor>` would point at the group div and
            label nothing. */}
        <span id={OTP_LABEL_ID} className='sr-only'>
          Verification code
        </span>
        <Input.OTP
          aria-labelledby={OTP_LABEL_ID}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          length={OTP_LENGTH}
          className='w-full'
          classNames={{ input: 'min-w-0 flex-1 aspect-square' }}
          inputMode='numeric'
          autoComplete='one-time-code'
          onChange={onOTPCodeChange}
          disabled={isPending || !pending}
          value={code}
        />

        {countdownValue > 0 && (
          <Countdown
            value={countDownDeadline}
            onFinish={() => setShowResendButton(true)}
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

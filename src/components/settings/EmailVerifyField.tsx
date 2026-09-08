'use client'

import { FC, useEffect, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { changeEmailConfirmAPI, changeEmailSendAPI } from '@api/auth/main'
import { type Locale } from '@i18n/config'
import { useRouter } from '@i18n/navigation'
import { localePath } from '@i18n/pathname'
import { FORM_ITEM_RULES } from '@constants/form'
import { processError } from '@helpers/error'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { MailIcon } from '@components/ui/icons'

type Props = {
  currentEmail?: string
  emailVerifiedAt?: string
  onVerified?: (email: string, emailVerifiedAt: string) => void
  /** When true, email is a named Form.Item still owned by the parent form. */
  name?: string
  disabled?: boolean
  /** Locale-free account profile path the verification link should open. */
  verifyPath: string
  /** Token from `?verifyEmail=` when the user opened the link in this page. */
  verifyToken?: string
}

/** Survives React Strict Mode remount so a link is not confirmed twice. */
const tokenStorageKey = (token: string): string => `bookie-email-verify:${token}`

/** Same shape the identity send route accepts — keep the button in step with the API. */
const isSendableEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

/**
 * Email field plus "Send verification email". The parent form still owns the
 * address; clicking the emailed link (account profile + token) is what saves
 * and marks it verified — not a 6-digit OTP, which belonged to phone change.
 */
export const EmailVerifyField: FC<Props> = ({
  currentEmail,
  emailVerifiedAt,
  onVerified,
  name = 'email',
  disabled,
  verifyPath,
  verifyToken,
}) => {
  const t = useTranslations('Settings.profile')
  const locale = useLocale() as Locale
  const { replace } = useRouter()
  const form = Form.useFormInstance()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const typedEmail = String(Form.useWatch(name, form) ?? '')
  const canSend =
    !disabled &&
    isSendableEmail(typedEmail.trim()) &&
    normalizeEmail(typedEmail) !== normalizeEmail(currentEmail ?? '')

  useEffect(() => {
    if (!verifyToken) return
    const key = tokenStorageKey(verifyToken)
    const seen = sessionStorage.getItem(key)
    if (seen === 'ok') {
      replace(verifyPath)
      return
    }
    if (seen === 'pending') return
    sessionStorage.setItem(key, 'pending')

    /* eslint-disable react-hooks/set-state-in-effect -- confirm the emailed token on mount */
    setError(null)
    setPending(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    void changeEmailConfirmAPI({ token: verifyToken })
      .then((result) => {
        sessionStorage.setItem(key, 'ok')
        setSuccess(t('emailVerified'))
        form.setFieldValue(name, result.email)
        onVerified?.(result.email, result.emailVerifiedAt)
        replace(verifyPath)
      })
      .catch((err: unknown) => {
        sessionStorage.removeItem(key)
        setError(processError(err).message)
      })
      .finally(() => setPending(false))
  }, [form, name, onVerified, replace, t, verifyPath, verifyToken])

  const handleSend = async () => {
    setError(null)
    setSuccess(null)
    const email = String(form.getFieldValue(name) ?? '').trim()
    if (!email) {
      setError(t('emailRequired'))
      return
    }
    setPending(true)
    try {
      await changeEmailSendAPI({ email, returnPath: localePath(locale, verifyPath) })
      setSuccess(t('emailCodeSent', { email }))
    } catch (err) {
      setError(processError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor={name} requirement='Optional'>
          {t('email')}
        </FieldLabel>
        <AppFormItem name={name} rules={[FORM_ITEM_RULES.email]} messageVariables={{ label: t('email') }}>
          <AppInput
            id={name}
            type='email'
            autoComplete='email'
            disabled={disabled}
            prefix={<MailIcon className='text-brand-muted h-4 w-4' />}
          />
        </AppFormItem>
        {emailVerifiedAt && currentEmail && (
          <AppText size='caption' tone='muted'>
            {t('verifiedAt', { date: new Date(emailVerifiedAt).toLocaleDateString() })}
          </AppText>
        )}
      </div>

      {error && <Alert type='error' showIcon message={error} />}
      {success && <Alert type='success' showIcon message={success} />}

      <AppButton type='default' onClick={handleSend} loading={pending} disabled={!canSend} className='self-start'>
        {t('sendEmailCode')}
      </AppButton>
    </div>
  )
}

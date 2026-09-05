'use client'

import { useState } from 'react'
import { Alert, Form } from 'antd'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { FORM_ITEM_RULES } from '@constants/form'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { writePendingSignOn } from '@helpers/localStorage'
import { toOptionalText, toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'

type ConsumerRegistrationFormValues = PhoneFormValues & {
  firstName: string
  lastName: string
  email?: string
}

const INITIAL_VALUES: ConsumerRegistrationFormValues = {
  firstName: '',
  lastName: '',
  code: undefined,
  number: '',
  email: '',
}

const EMAIL_RULES = [FORM_ITEM_RULES.email]

/**
 * Consumer registration, per `design/initial prototype/consumer_registration`.
 *
 * Nothing is persisted here: the account is only created once the OTP verifies, so the
 * collected profile is stashed as a draft and replayed into `POST /identity/login` from the
 * code screen. Ant Design `Form` owns all state — no Formik, and no `value`/`onChange` on a
 * named field, since antd's own store value would override it.
 */
export const ConsumerRegistrationForm: React.FC = () => {
  const { push } = useRouter()
  const [form] = Form.useForm<ConsumerRegistrationFormValues>()
  const getCodeByPhoneNumber = useAuthStore.use.getCodeByPhoneNumber()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')

  const handleFinish = async (values: ConsumerRegistrationFormValues) => {
    setSubmitError(null)

    const phone = toPhoneNumber(values.code!, values.number)

    try {
      writePendingSignOn({
        phone,
        registration: {
          userType: USER_TYPES.consumer,
          profile: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: toOptionalText(values.email),
            country: values.code,
          },
        },
      })

      await getCodeByPhoneNumber({ phone })
      push(ROUTES.codeInput)
    } catch (error) {
      // Staying put matters: navigating on a failed send would strand the user on an OTP
      // screen waiting for a code that was never sent.
      setSubmitError(processError(error).message)
    }
  }

  return (
    <Form
      form={form}
      name='consumerRegistration'
      layout='vertical'
      requiredMark={false}
      initialValues={INITIAL_VALUES}
      onFinish={handleFinish}
      scrollToFirstError
      className='flex w-full flex-col gap-5'
    >
      {submitError && <Alert type='error' showIcon message={submitError} />}

      <RegistrationField
        name='firstName'
        label='First Name'
        requirement='Required'
        placeholder='Alex'
        autoComplete='given-name'
        rules={nameRules}
        icon={<UserIcon className='text-brand-muted h-4 w-4' />}
        disabled={isPending}
      />

      <RegistrationField
        name='lastName'
        label='Last Name'
        requirement='Required'
        placeholder='Morgan'
        autoComplete='family-name'
        rules={nameRules}
        icon={<UserIcon className='text-brand-muted h-4 w-4' />}
        disabled={isPending}
      />

      <PhoneNumberField label='Mobile Number' requirement='Required' disabled={isPending} />

      <RegistrationField
        name='email'
        label='Email Address'
        requirement='Optional'
        placeholder='alex@example.com'
        type='email'
        autoComplete='email'
        rules={EMAIL_RULES}
        icon={<MailIcon className='text-brand-muted h-4 w-4' />}
        disabled={isPending}
      />

      <AppButton type='primary' variant='solid' htmlType='submit' className='mt-4 w-full' loading={isPending}>
        Create Account
      </AppButton>
    </Form>
  )
}

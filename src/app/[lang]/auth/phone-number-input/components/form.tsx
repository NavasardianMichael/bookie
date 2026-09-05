'use client'

import { useState } from 'react'
import { Alert, Form } from 'antd'
import { useAuthStore } from '@store/auth/store'
import { useRouter } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { writePendingSignOn } from '@helpers/localStorage'
import { toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { PhoneFormValues, PhoneNumberField } from '../../components/PhoneNumberField'

const INITIAL_VALUES: PhoneFormValues = {
  code: undefined,
  number: '',
}

/**
 * Sign-in for a returning user: phone, then OTP. No profile fields and no role — the server
 * reads the role off the account that already exists.
 *
 * Registration is the other entry point, and it is role-specific
 * (`/auth/consumer-registration`, `/auth/provider-registration`). Ant Design `Form` owns
 * state here; the Formik binding this file used to carry is what made antd's store and the
 * form's values disagree.
 */
export const SignOnForm: React.FC = () => {
  const { push } = useRouter()
  const [form] = Form.useForm<PhoneFormValues>()
  const getCodeByPhoneNumber = useAuthStore.use.getCodeByPhoneNumber()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleFinish = async (values: PhoneFormValues) => {
    setSubmitError(null)

    const phone = toPhoneNumber(values.code!, values.number)

    try {
      // No `registration`, deliberately: writing the record without one also discards any
      // half-finished registration draft, which would otherwise be replayed onto whichever
      // account this phone number belongs to.
      writePendingSignOn({ phone })

      await getCodeByPhoneNumber({ phone })
      push(ROUTES.codeInput)
    } catch (error) {
      setSubmitError(processError(error).message)
    }
  }

  return (
    <Form
      form={form}
      name='signOn'
      layout='vertical'
      requiredMark={false}
      initialValues={INITIAL_VALUES}
      onFinish={handleFinish}
      scrollToFirstError
      className='flex w-full flex-col gap-5'
    >
      {submitError && <Alert type='error' showIcon message={submitError} />}

      <PhoneNumberField label='Mobile Number' disabled={isPending} />

      <AppButton type='primary' variant='solid' htmlType='submit' className='w-full' loading={isPending}>
        Send Verification Code
      </AppButton>
    </Form>
  )
}

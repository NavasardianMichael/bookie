'use client'

import { useState } from 'react'
import { Alert, Form } from 'antd'
import type { Rule } from 'antd/es/form'
import { useAuthStore } from '@store/auth/store'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { OrganizationValue } from '@interfaces/auth'
import { useRouter } from '@i18n/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { writePendingSignOn } from '@helpers/localStorage'
import { toOptionalText, toOrganizationFields, toPhoneNumber } from '@helpers/registration'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { MailIcon, UserIcon } from '@components/ui/icons'
import { OrganizationAutocomplete } from './OrganizationAutocomplete'
import { FieldLabel } from '../components/FieldLabel'
import { PhoneFormValues, PhoneNumberField } from '../components/PhoneNumberField'
import { RegistrationField } from '../components/RegistrationField'

type ProviderRegistrationFormValues = PhoneFormValues & {
  organization?: OrganizationValue
  firstName: string
  lastName: string
  email: string
}

const INITIAL_VALUES: ProviderRegistrationFormValues = {
  organization: undefined,
  firstName: '',
  lastName: '',
  email: '',
  code: undefined,
  number: '',
}

const ORGANIZATION_INPUT_ID = 'organization'

/**
 * `required` cannot express this: the field's value is an object, so antd would accept
 * `{ name: '' }` as present. The name itself has to carry text.
 */
const ORGANIZATION_RULES: Rule[] = [
  {
    validator: (_, value: OrganizationValue | undefined) =>
      value?.name?.trim() ? Promise.resolve() : Promise.reject(new Error('Please fill in Organization')),
  },
]

/**
 * Provider registration, per `design/initial prototype/provider_registration`.
 *
 * The prototype's "Business Name" is an Organization combobox here, and first and last name
 * are collected alongside it so a provider is never created with the server's placeholder
 * name. As with the consumer form, nothing is written until the OTP verifies.
 */
export const ProviderRegistrationForm: React.FC = () => {
  const { push } = useRouter()
  const [form] = Form.useForm<ProviderRegistrationFormValues>()
  const getCodeByPhoneNumber = useAuthStore.use.getCodeByPhoneNumber()
  const isPending = useAuthStore.use.isPending()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const emailRules = useFormItemRules('required', 'email')

  const handleFinish = async (values: ProviderRegistrationFormValues) => {
    setSubmitError(null)

    const phone = toPhoneNumber(values.code!, values.number)

    try {
      writePendingSignOn({
        phone,
        registration: {
          userType: USER_TYPES.provider,
          profile: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: toOptionalText(values.email),
            country: values.code,
            ...toOrganizationFields(values.organization),
          },
        },
      })

      await getCodeByPhoneNumber({ phone })
      push(ROUTES.codeInput)
    } catch (error) {
      setSubmitError(processError(error).message)
    }
  }

  return (
    <Form
      form={form}
      name='providerRegistration'
      layout='vertical'
      requiredMark={false}
      initialValues={INITIAL_VALUES}
      onFinish={handleFinish}
      scrollToFirstError
      className='flex w-full flex-col gap-4'
    >
      {submitError && <Alert type='error' showIcon message={submitError} />}

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor={ORGANIZATION_INPUT_ID} className='text-brand font-semibold'>
          Organization
        </FieldLabel>
        <AppFormItem name='organization' rules={ORGANIZATION_RULES} messageVariables={{ label: 'Organization' }}>
          <OrganizationAutocomplete id={ORGANIZATION_INPUT_ID} placeholder='Acme Services' disabled={isPending} />
        </AppFormItem>
      </div>

      <RegistrationField
        name='firstName'
        label='First Name'
        placeholder='Alex'
        autoComplete='given-name'
        rules={nameRules}
        icon={<UserIcon className='text-brand-muted h-4 w-4' />}
        disabled={isPending}
        labelClassName='text-brand font-semibold'
      />

      <RegistrationField
        name='lastName'
        label='Last Name'
        placeholder='Morgan'
        autoComplete='family-name'
        rules={nameRules}
        icon={<UserIcon className='text-brand-muted h-4 w-4' />}
        disabled={isPending}
        labelClassName='text-brand font-semibold'
      />

      <RegistrationField
        name='email'
        label='Professional Email'
        placeholder='name@company.com'
        type='email'
        autoComplete='email'
        rules={emailRules}
        icon={<MailIcon className='text-brand-muted h-4 w-4' />}
        disabled={isPending}
        labelClassName='text-brand font-semibold'
      />

      <PhoneNumberField
        label='Phone Number (Mandatory)'
        disabled={isPending}
        labelClassName='text-brand font-semibold'
      />

      <AppButton type='primary' variant='solid' htmlType='submit' className='mt-4 w-full' loading={isPending}>
        Create Provider Account
      </AppButton>
    </Form>
  )
}

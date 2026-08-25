'use client'

import { useCallback } from 'react'
import { Form, Select, Space } from 'antd'
import { useFormik } from 'formik'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth/store'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/form'
import { ROUTES } from '@constants/routes'
import { SIGN_ON_FORM_INITIAL_VALUES } from '@constants/sign-on'
import { LOCAL_STORAGE_KEYS } from '@helpers/localStorage'
import AppButton from '@components/ui/AppButton'
import AppInput from '@components/ui/AppInput'
import { useCountries } from '../useCountries'

type RegistrationFormValues = typeof SIGN_ON_FORM_INITIAL_VALUES

const SignOnForm: React.FC = () => {
  const { push } = useRouter()
  const { getCodeByPhoneNumber, isPending } = useAuthStore()
  const countries = useCountries()
  const [form] = Form.useForm()

  const formik = useFormik<RegistrationFormValues>({
    initialValues: SIGN_ON_FORM_INITIAL_VALUES,
    validateOnChange: false,
    onSubmit: async (values) => {
      const processedCountryCode = getCountryCallingCode(values.code!)
      localStorage.setItem(LOCAL_STORAGE_KEYS.phoneNumber, values.number)
      localStorage.setItem(LOCAL_STORAGE_KEYS.countryCode, processedCountryCode)

      await getCodeByPhoneNumber({
        phone: {
          code: +processedCountryCode,
          number: +values.number,
        },
      })
      push(ROUTES.codeInput)
    },
  })

  const handleCountryChange = useCallback(
    (value: string) => {
      formik.setFieldValue('code', value)
    },
    [formik]
  )

  const validatePhoneNumber = useCallback(
    (_: unknown, value: string) => {
      if (!value || !formik.values.code) return Promise.resolve()
      try {
        const fullNumber = `+${getCountryCallingCode(formik.values.code)}${value}`
        if (isValidPhoneNumber(fullNumber)) return Promise.resolve()
        return Promise.reject('Please enter a valid phone number')
      } catch (_error) {
        return Promise.reject('Please enter a valid phone number')
      }
    },
    [formik.values.code]
  )

  const handlePhoneNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      formik.setErrors({ code: undefined, number: undefined })
      formik.setFieldValue('number', e.target.value)
    },
    [formik]
  )

  const placeholder = 'Phone number'

  return (
    <Form
      form={form}
      autoComplete='off'
      requiredMark={false}
      className='w-full flex flex-col'
      layout='vertical'
      validateTrigger={['onSubmit']}
      onFinish={formik.handleSubmit}
    >
      <Form.Item required className='mb-1'>
        <Space.Compact className='w-full'>
          <Form.Item<RegistrationFormValues>
            name='code'
            messageVariables={{ label: 'Country Code' }}
            rules={FORM_ITEM_REQUIRED_RULE_SET}
            validateTrigger={['onChange']}
            className='mb-0 w-[7.5rem] shrink-0'
          >
            <Select
              value={formik.values.code}
              labelRender={(option) => option.label}
              onChange={handleCountryChange}
              options={countries}
              showSearch
              optionFilterProp='label'
              popupMatchSelectWidth={320}
              disabled={isPending}
              size='large'
              aria-label='Country code'
            />
          </Form.Item>

          <Form.Item<RegistrationFormValues>
            name='number'
            messageVariables={{ label: 'phone number' }}
            rules={[...FORM_ITEM_REQUIRED_RULE_SET, { validator: validatePhoneNumber }]}
            className='mb-0 grow'
          >
            <AppInput
              type='tel'
              name='phone'
              value={formik.values.number}
              onChange={handlePhoneNumberChange}
              disabled={isPending}
              placeholder={placeholder}
              inputMode='numeric'
              autoComplete='tel-national'
              enterKeyHint='send'
            />
          </Form.Item>
        </Space.Compact>
      </Form.Item>

      <AppButton type='primary' variant='solid' htmlType='submit' className='w-full' loading={isPending}>
        Send Verification Code
      </AppButton>
    </Form>
  )
}

export default SignOnForm

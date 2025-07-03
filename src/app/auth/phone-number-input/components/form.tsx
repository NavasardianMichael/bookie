'use client'

import { useCallback, useMemo } from 'react'
import '@ant-design/v5-patch-for-react-19'
import { Button, Flex, Form, Input, Select } from 'antd'
import { useFormik } from 'formik'
import { getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth/store'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/auth/form'
import { REGISTRATION_FORM_INITIAL_VALUES } from '@constants/auth/registration'
import { ROUTES } from '@constants/routes'
import { useCountries } from '../useCountries'

type RegistrationFormValues = typeof REGISTRATION_FORM_INITIAL_VALUES

const SignOnForm: React.FC = () => {
  const { replace } = useRouter()
  const { getCodeByPhoneNumber, isPending } = useAuthStore()
  const countries = useCountries()
  const [form] = Form.useForm()

  const formik = useFormik<RegistrationFormValues>({
    initialValues: REGISTRATION_FORM_INITIAL_VALUES,
    validateOnChange: false,
    onSubmit: async (values) => {
      await getCodeByPhoneNumber(values)
      localStorage.setItem('phoneNumber', values.phoneNumber)
      replace(ROUTES.codeInput)
    },
  })

  const handleCountryChange = useCallback(
    (value: string) => {
      formik.setFieldValue('countryCode', value)
    },
    [formik]
  )

  const validatePhoneNumber = useCallback(
    (_: any, value: string) => {
      if (!value || !formik.values.countryCode) return Promise.resolve()
      try {
        const fullNumber = `+${getCountryCallingCode(formik.values.countryCode)}${value}`
        if (isValidPhoneNumber(fullNumber)) return Promise.resolve()
        return Promise.reject('Please enter a valid phone number')
      } catch (error) {
        return Promise.reject('Please enter a valid phone number')
      }
    },
    [formik.values.countryCode]
  )

  const formatPhoneNumber = useCallback(
    (value: string) => {
      if (!value || !formik.values.countryCode) return value
      try {
        const fullNumber = `+${getCountryCallingCode(formik.values.countryCode)}${value}`
        const phoneNumber = parsePhoneNumberWithError(fullNumber)
        return phoneNumber
          .formatNational()
          .replace(`+${getCountryCallingCode(formik.values.countryCode)}`, '')
          .trim()
      } catch (error) {
        return value
      }
    },
    [formik.values.countryCode]
  )

  const handlePhoneNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = formatPhoneNumber(e.target.value)
      form.setFields([{ name: 'phoneNumber', errors: [] }])
      formik.setFieldValue('phoneNumber', formattedValue)
    },
    [formatPhoneNumber, formik.setFieldValue, form]
  )

  // Create placeholder text for the phone input
  const placeholder = useMemo(() => {
    if (!formik.values.countryCode) return 'Enter Phone Number'
    return `Enter number without +${getCountryCallingCode(formik.values.countryCode)}`
  }, [formik.values.countryCode])

  return (
    <Form
      form={form}
      autoComplete="off"
      requiredMark={false}
      className="w-full max-w-[500px]"
      layout="vertical"
      validateTrigger={['onSubmit']}
      onFinish={formik.handleSubmit}
    >
      <Form.Item required>
        <Flex>
          <Form.Item<RegistrationFormValues>
            name="countryCode"
            messageVariables={{ label: 'country' }}
            rules={FORM_ITEM_REQUIRED_RULE_SET}
            validateTrigger={['onChange']}
            className="w-42 mb-0! mr-0"
            label="Select Country Code"
          >
            <Select
              value={formik.values.countryCode}
              labelRender={(option) => option.label}
              onChange={handleCountryChange}
              options={countries}
              className="custom-antd-select border-r-0!"
              disabled={isPending}
            />
          </Form.Item>

          <Form.Item<RegistrationFormValues>
            name="phoneNumber"
            label="Fill in Phone Number"
            messageVariables={{ label: 'phone number' }}
            rules={[...FORM_ITEM_REQUIRED_RULE_SET, { validator: validatePhoneNumber }]}
            className="mb-0! flex-1"
          >
            <Input
              type="tel"
              name="phone"
              value={formik.values.phoneNumber}
              onChange={handlePhoneNumberChange}
              disabled={isPending}
              placeholder={placeholder}
              className="rounded-l-none!"
            />
          </Form.Item>
        </Flex>
      </Form.Item>

      <Flex>
        <Button type="primary" variant="solid" htmlType="submit" className="mx-auto">
          Send Verification Code
        </Button>
      </Flex>
    </Form>
  )
}

export default SignOnForm

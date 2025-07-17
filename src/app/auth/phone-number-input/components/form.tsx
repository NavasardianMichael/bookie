'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { Button, Flex, Form, Input, Select } from 'antd'
import { useFormik } from 'formik'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth/store'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/auth/form'
import { REGISTRATION_FORM_INITIAL_VALUES } from '@constants/auth/registration'
import { ROUTES } from '@constants/routes'
import { useCountries } from '../useCountries'

import '@ant-design/v5-patch-for-react-19'

type RegistrationFormValues = typeof REGISTRATION_FORM_INITIAL_VALUES

const SignOnForm: React.FC = () => {
  const { push } = useRouter()
  const { getCodeByPhoneNumber, isPending } = useAuthStore()
  const countries = useCountries()
  const [form] = Form.useForm()

  const formik = useFormik<RegistrationFormValues>({
    initialValues: REGISTRATION_FORM_INITIAL_VALUES,
    validateOnChange: false,
    onSubmit: async (values) => {
      await getCodeByPhoneNumber(values)
      const countryCode = getCountryCallingCode(values.countryCode!)
      localStorage.setItem('countryCode', countryCode)
      localStorage.setItem('phoneNumber', values.phoneNumber)
      push(ROUTES.codeInput)
    },
  })

  // Auto-detect user's country
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Only set country if not already set
        if (formik.values.countryCode) return

        // Try to get country from IP geolocation
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()

        if (data.country_code) {
          const countryCode = data.country_code.toUpperCase()
          // Check if the detected country is in our countries list
          const countryExists = countries.some((country) => country.value === countryCode)

          if (countryExists) {
            formik.setFieldValue('countryCode', countryCode)
            form.setFieldValue('countryCode', countryCode)
          }
        }
      } catch (_error) {
        console.warn('Could not detect country from https://ipapi.co/json/. Falling back to browser locale.')
        // Fallback to browser locale if IP detection fails
        try {
          const locale = navigator.language || navigator.languages[0]
          const countryCode = locale.split('-')[1]?.toUpperCase()

          if (countryCode) {
            const countryExists = countries.some((country) => country.value === countryCode)
            if (countryExists) {
              formik.setFieldValue('countryCode', countryCode)
              form.setFieldValue('countryCode', countryCode)
            }
          } else {
            console.warn('Could not extract country code from locale:', locale)
          }
        } catch (fallbackError) {
          console.warn('Could not detect country:', fallbackError)
        }
      }
    }

    // Only run detection if countries are loaded
    if (countries.length > 0) {
      detectCountry()
    }
  }, [countries, formik, form])

  const handleCountryChange = useCallback(
    (value: string) => {
      formik.setFieldValue('countryCode', value)
    },
    [formik]
  )

  const validatePhoneNumber = useCallback(
    (_: unknown, value: string) => {
      if (!value || !formik.values.countryCode) return Promise.resolve()
      try {
        const fullNumber = `+${getCountryCallingCode(formik.values.countryCode)}${value}`
        if (isValidPhoneNumber(fullNumber)) return Promise.resolve()
        return Promise.reject('Please enter a valid phone number')
      } catch (_error) {
        return Promise.reject('Please enter a valid phone number')
      }
    },
    [formik.values.countryCode]
  )

  // const formatPhoneNumber = useCallback(
  //   (value: string) => {
  //     if (!value || !formik.values.countryCode) return value
  //     try {
  //       const fullNumber = `+${getCountryCallingCode(formik.values.countryCode)}${value}`
  //       const phoneNumber = parsePhoneNumberWithError(fullNumber)
  //       return phoneNumber
  //         .formatNational()
  //         .replace(`+${getCountryCallingCode(formik.values.countryCode)}`, '')
  //         .trim()
  //     } catch (_error) {
  //       return value
  //     }
  //   },
  //   [formik.values.countryCode]
  // )

  const handlePhoneNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setFields([{ name: 'phoneNumber', errors: [] }])
      formik.setFieldValue('phoneNumber', e.target.value)
    },
    [formik, form]
  )

  // Create placeholder text for the phone input
  const placeholder = useMemo(() => {
    if (!formik.values.countryCode) return 'Enter Phone Number'
    return `Enter number without +${getCountryCallingCode(formik.values.countryCode)}`
  }, [formik.values.countryCode])

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
        <Flex>
          <Form.Item<RegistrationFormValues>
            name='countryCode'
            messageVariables={{ label: 'Country Code' }}
            rules={FORM_ITEM_REQUIRED_RULE_SET}
            validateTrigger={['onChange']}
            className='mb-0! mr-0 w-[130px]'
          >
            <Select
              value={formik.values.countryCode}
              labelRender={(option) => option.label}
              onChange={handleCountryChange}
              options={countries}
              className='custom-antd-select border-r-0! h-[56px]! bg-transparent! d-block w-full!'
              disabled={isPending}
            />
          </Form.Item>

          <Form.Item<RegistrationFormValues>
            name='phoneNumber'
            messageVariables={{ label: 'phone number' }}
            rules={[...FORM_ITEM_REQUIRED_RULE_SET, { validator: validatePhoneNumber }]}
            className='mb-0! grow'
          >
            <Input
              type='tel'
              name='phone'
              value={formik.values.phoneNumber}
              onChange={handlePhoneNumberChange}
              disabled={isPending}
              placeholder={placeholder}
              className='rounded-l-none! h-[56px] bg-transparent!'
            />
          </Form.Item>
        </Flex>
      </Form.Item>

      <Button type='primary' variant='solid' htmlType='submit' className='w-full h-[56px]!' loading={isPending}>
        Send Verification Code
      </Button>
    </Form>
  )
}

export default SignOnForm

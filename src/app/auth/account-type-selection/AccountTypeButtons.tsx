'use client'

import { Flex, Form, Segmented, SegmentedProps, Typography } from 'antd'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { LOCAL_STORAGE_KEYS } from '@helpers/localStorage'
import { AppButton } from '@components/ui/AppButton'

type AccountTypeFormValues = {
  accountType: (typeof ACCOUNT_TYPE_OPTIONS)[number]['value']
}

const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Client', value: USER_TYPES.consumer },
  { label: 'Service Provider', value: USER_TYPES.provider },
] as const

const ACCOUNT_TYPE_FORM_INITIAL_VALUES: AccountTypeFormValues = {
  accountType: ACCOUNT_TYPE_OPTIONS[1].value,
}

export const AccountTypeButtons: React.FC = () => {
  const { push } = useRouter()

  const formik = useFormik<AccountTypeFormValues>({
    initialValues: ACCOUNT_TYPE_FORM_INITIAL_VALUES,
    validateOnChange: false,
    onSubmit: async (values) => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.accountType, values.accountType)
      push(ROUTES.phoneNumberInput)
    },
  })

  const onRoleChange: SegmentedProps['onChange'] = (value) => {
    formik.setFieldValue('accountType', value)
  }

  return (
    <Form layout='vertical' onFinish={formik.handleSubmit} className='flex h-full w-full'>
      <Flex vertical gap={8} justify='center' className='w-full'>
        <Form.Item name='accountType' className='mb-0 w-full'>
          <Segmented<AccountTypeFormValues['accountType']>
            block
            options={[...ACCOUNT_TYPE_OPTIONS]}
            value={formik.values.accountType}
            onChange={onRoleChange}
          />
        </Form.Item>
        <Flex vertical gap={16} className='w-full'>
          <Flex vertical gap={8} className='w-full'>
            <Typography.Paragraph type='secondary' className='mb-0 text-center text-base'>
              Quick access — sign in with your phone number to get started.
            </Typography.Paragraph>

            <AppButton type='primary' htmlType='submit' className='w-full' disabled={!formik.values.accountType}>
              Continue
            </AppButton>
          </Flex>
        </Flex>
      </Flex>
    </Form>
  )
}

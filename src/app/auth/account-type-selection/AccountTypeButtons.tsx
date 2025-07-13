'use client'

import { Button, Form, Radio } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { USER_TYPES } from '@constants/auth'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/auth/form'
import { ROUTES } from '@constants/routes'

type AccountTypeFormValues = {
  accountType: string
}

const ACCOUNT_TYPE_FORM_INITIAL_VALUES: AccountTypeFormValues = {
  accountType: '',
}

const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Service Provider', value: USER_TYPES.provider },
  { label: 'Service Consumer', value: USER_TYPES.consumer },
]

const AccountTypeButtons: React.FC = () => {
  const { push } = useRouter()
  const [form] = Form.useForm()

  const formik = useFormik<AccountTypeFormValues>({
    initialValues: ACCOUNT_TYPE_FORM_INITIAL_VALUES,
    validateOnChange: false,
    onSubmit: async (values) => {
      localStorage.setItem('accountType', values.accountType)
      push(ROUTES.phoneNumberInput)
    },
  })

  return (
    <Form form={form} layout='vertical' onFinish={formik.handleSubmit} className='w-full'>
      <Paragraph type='secondary' className='text-base! text-center mb-0!'>
        Quick access — sign in with your phone number to get started.
      </Paragraph>

      <AccountTypeButtons />
      <Form.Item label='Account Type' name='accountType' rules={FORM_ITEM_REQUIRED_RULE_SET} className='mb-4'>
        <Radio.Group
          options={ACCOUNT_TYPE_OPTIONS}
          optionType='button'
          buttonStyle='solid'
          size='large'
          className='w-full'
          value={formik.values.accountType}
          onChange={(e) => formik.setFieldValue('accountType', e.target.value)}
        />
      </Form.Item>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src='/logo.svg' alt='Bookie logo' className='h-[300px] md:h-[400px] object-cover' />

      <Button
        type='primary'
        htmlType='submit'
        size='large'
        className='w-full py-6!'
        disabled={!formik.values.accountType}
      >
        Sign on
      </Button>
    </Form>
  )
}

export default AccountTypeButtons

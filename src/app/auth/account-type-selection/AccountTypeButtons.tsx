'use client'

import { Button, CheckboxOptionType, Flex, Form, Radio } from 'antd'
import Paragraph from 'antd/es/typography/Paragraph'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { USER_TYPES } from '@constants/auth'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/auth/form'
import { ROUTES } from '@constants/routes'

type AccountTypeFormValues = {
  accountType: (typeof ACCOUNT_TYPE_OPTIONS)[number]['value']
}

const ACCOUNT_TYPE_OPTIONS: CheckboxOptionType[] = [
  {
    label: 'Client',
    value: USER_TYPES.consumer,
    style: { flexGrow: 1, flexBasis: 1, textAlign: 'center' },
  },
  {
    label: 'Service Provider',
    value: USER_TYPES.provider,
    style: { flexGrow: 1, flexBasis: 1, textAlign: 'center' },
  },
]

const ACCOUNT_TYPE_FORM_INITIAL_VALUES: AccountTypeFormValues = {
  accountType: ACCOUNT_TYPE_OPTIONS[0].value,
}

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
    <Form form={form} layout='vertical' onFinish={formik.handleSubmit} className='w-full h-full flex'>
      <Flex vertical gap={8} justify='center'>
        <Form.Item name='accountType' rules={FORM_ITEM_REQUIRED_RULE_SET} className='mb-0! w-full'>
          <Radio.Group
            options={ACCOUNT_TYPE_OPTIONS}
            optionType='button'
            buttonStyle='solid'
            size='large'
            className='w-full flex! gap-2!'
            value={formik.values.accountType}
            onChange={(e) => formik.setFieldValue('accountType', e.target.value)}
          />
        </Form.Item>
        {}
        <Flex vertical className='w-full h-full grow!' justify='space-between'>
          <img src='/logo.svg' alt='Bookie logo' className='h-[200px] md:h-[400px] object-cover m-auto' />

          <Flex vertical gap={8} className='w-full'>
            <Paragraph type='secondary' className='text-base! text-center mb-0!'>
              Quick access — sign in with your phone number to get started.
            </Paragraph>

            <Button
              type='primary'
              htmlType='submit'
              size='large'
              className='w-full py-6!'
              disabled={!formik.values.accountType}
            >
              Sign on
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Form>
  )
}

export default AccountTypeButtons

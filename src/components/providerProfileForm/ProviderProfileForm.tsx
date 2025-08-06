'use client'

import { useState } from 'react'
import { Button, Form, Input } from 'antd'
import { useFormik } from 'formik'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/form'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import { sleep } from '@helpers/commons'

import '@ant-design/v5-patch-for-react-19'

type Props = {
  initialValues?: ProviderProfileFormValues
}

const ProviderProfileForm: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_FORM_INITIAL_VALUES }) => {
  const [isPending, setIsPending] = useState(false)
  const [form] = Form.useForm()

  const formik = useFormik<typeof initialValues>({
    initialValues,
    validateOnChange: false,
    onSubmit: async (values) => {
      setIsPending(true)
      await sleep(3000)
      console.log({ values })
      setIsPending(false)
    },
  })

  return (
    <Form
      form={form}
      requiredMark={false}
      className='w-full flex flex-col'
      layout='vertical'
      validateTrigger={['onSubmit']}
      onFinish={formik.handleSubmit}
    >
      <Form.Item<typeof initialValues>
        name='firstName'
        label='First Name'
        messageVariables={{ label: 'First Name' }}
        rules={FORM_ITEM_REQUIRED_RULE_SET}
        validateTrigger={['onChange']}
        className='mr-0'
      >
        <Input
          name='firstName'
          value={formik.values.firstName}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
          className='rounded-l-none! bg-transparent!'
        />
      </Form.Item>

      <Form.Item<typeof initialValues>
        name='lastName'
        label='Last Name'
        messageVariables={{ label: 'Last Name' }}
        rules={FORM_ITEM_REQUIRED_RULE_SET}
        validateTrigger={['onChange']}
      >
        <Input
          name='lastName'
          value={formik.values.lastName}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
          className='rounded-l-none! bg-transparent!'
        />
      </Form.Item>

      <Form.Item<typeof initialValues>
        name='email'
        label='Email'
        messageVariables={{ label: 'Email' }}
        rules={FORM_ITEM_REQUIRED_RULE_SET}
        validateTrigger={['onChange']}
      >
        <Input
          type='email'
          name='email'
          value={formik.values.email}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
          className='rounded-l-none! bg-transparent!'
        />
      </Form.Item>

      <Button type='primary' variant='solid' htmlType='submit' className='w-full h-[56px]!' loading={isPending}>
        Proceed to Services
      </Button>
    </Form>
  )
}

export default ProviderProfileForm

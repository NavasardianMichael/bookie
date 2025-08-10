'use client'

import { useState } from 'react'
import { Form } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { useFormik } from 'formik'
import { ProviderProfileFormValues } from '@interfaces/providers'
import { FORM_ITEM_REQUIRED_RULE_SET } from '@constants/form'
import { PROVIDER_PROFILE_FORM_INITIAL_VALUES } from '@constants/providers'
import { sleep } from '@helpers/commons'
import AppButton from '@components/ui/AppButton'
import AppInput from '@components/ui/AppInput'
import CategoriesSelect from './CategoriesSelect'
import OrganizationSelect from './OrganizationSelect'

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
      requiredMark={true}
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
        required
      >
        <AppInput
          name='firstName'
          value={formik.values.firstName}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
        />
      </Form.Item>

      <Form.Item<typeof initialValues>
        name='lastName'
        label='Last Name'
        messageVariables={{ label: 'Last Name' }}
        rules={FORM_ITEM_REQUIRED_RULE_SET}
        validateTrigger={['onChange']}
      >
        <AppInput
          name='lastName'
          value={formik.values.lastName}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
        />
      </Form.Item>

      <Form.Item<typeof initialValues>
        name='categories'
        label='Categories'
        messageVariables={{ label: 'Categories' }}
        rules={FORM_ITEM_REQUIRED_RULE_SET}
        validateTrigger={['onChange']}
      >
        <CategoriesSelect formik={formik} />
      </Form.Item>

      <Form.Item<typeof initialValues>
        name='organization'
        label='Organization'
        messageVariables={{ label: 'Organization' }}
      >
        <OrganizationSelect formik={formik} />
      </Form.Item>

      <Form.Item<typeof initialValues> name='email' label='Email' messageVariables={{ label: 'Email' }}>
        <AppInput
          type='email'
          name='email'
          value={formik.values.email}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
        />
      </Form.Item>

      <Form.Item<typeof initialValues> name='description' label='Notes' messageVariables={{ label: 'Notes' }}>
        <TextArea
          name='description'
          value={formik.values.description}
          onChange={formik.handleChange}
          disabled={isPending}
          size='large'
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </Form.Item>

      <AppButton type='primary' variant='solid' htmlType='submit' className='w-full h-[56px]!' loading={isPending}>
        Proceed to Services
      </AppButton>
    </Form>
  )
}

export default ProviderProfileForm

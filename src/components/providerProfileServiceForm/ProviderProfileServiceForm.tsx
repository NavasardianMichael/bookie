'use client'

import React from 'react'
import { Form } from 'antd'
import { useRouter } from 'next/navigation'
import { ProviderProfileServiceFormValues } from '@interfaces/services'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import AppProfileFormItem from '@components/ui/AppFormItem'
import AppInput from '@components/ui/AppInput'

import '@ant-design/v5-patch-for-react-19'

type Props = {
  initialValues?: ProviderProfileServiceFormValues
}

const ProviderProfileServiceForm: React.FC<Props> = ({
  initialValues = PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES,
}) => {
  const { push } = useRouter()
  const [form] = Form.useForm()
  return (
    <Form
      form={form}
      requiredMark={true}
      className={`w-full flex flex-col gap-4`}
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <AppProfileFormItem name='firstName' label='First Name' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='firstName'
          value={formik.values.firstName}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          size='large'
        />
      </AppProfileFormItem>
    </Form>
  )
}

export default ProviderProfileServiceForm

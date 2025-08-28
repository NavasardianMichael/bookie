'use client'

import React from 'react'
import { Flex, Form, FormInstance, InputNumber, InputNumberProps, Select, TimePicker } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import Paragraph from 'antd/es/typography/Paragraph'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { AppFormProps } from '@interfaces/forms'
import { ProviderProfileServiceFormValues } from '@interfaces/services'
import AppProfileFormItem from '@components/ui/AppFormItem'
import AppInput from '@components/ui/AppInput'

import '@ant-design/v5-patch-for-react-19'

type Props = AppFormProps<ProviderProfileServiceFormValues> & {
  form?: FormInstance
}

// export type ProviderProfileServiceFormValues = Pick<
//   ProviderService,
//   'name' | 'duration' | 'description' | 'price' | 'currency' | 'image' | 'categoryId'
// > & {
//   id?: ProviderService['id']
// }

const ProviderProfileServiceForm: React.FC<Props> = ({ formik }) => {
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaRequiredAndMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForTextarea')

  const onDurationBlur: InputNumberProps['onBlur'] = async (event) => {
    await formik.setFieldValue('duration', Math.round(+event.currentTarget.value / 5) * 5)
  }

  return (
    <Form
      // form={form}
      requiredMark={true}
      className='w-full flex flex-col gap-4'
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <AppProfileFormItem name='title' label='Title' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='firstName'
          value={formik.values.name}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
        />
      </AppProfileFormItem>
      <AppProfileFormItem name='description' label='Description' rules={textareaRequiredAndMaxCharsCountRuleSet}>
        <TextArea
          name='description'
          value={formik.values.description}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </AppProfileFormItem>
      <AppProfileFormItem name='duration' label='Duration' required hasFeedback={false}>
        <InputNumber
          controls
          size='large'
          name='duration'
          className='w-full'
          placeholder='Select a duration'
          value={formik.values.duration}
          onBlur={onDurationBlur}
          disabled={formik.isSubmitting}
          min={5}
          step={5}
          max={1440}
          addonAfter='mins'
        />
      </AppProfileFormItem>

      <AppProfileFormItem name='price' label='Price' hasFeedback={false} required className='p-0!'>
        <InputNumber
          value={formik.values.price}
          onChange={formik.handleChange}
          className='w-full px-0!'
          addonAfter={
            <AppProfileFormItem name='currency' hasFeedback={false} className='w-[80px]! p-0!'>
              {/* Price */}
              <Select
                className='p-0!'
                value={formik.values.currency}
                onChange={formik.handleChange}
                options={[
                  { label: 'USD', value: 'USD' },
                  { label: 'EUR', value: 'EUR' },
                ]}
              />
            </AppProfileFormItem>
          }
        />
      </AppProfileFormItem>
    </Form>
  )
}

export default ProviderProfileServiceForm

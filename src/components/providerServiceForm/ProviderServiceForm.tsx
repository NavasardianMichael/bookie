'use client'

import React, { useCallback } from 'react'
import { Flex, Form, FormInstance, InputNumber, Select } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { AppFormProps } from '@interfaces/forms'
import { ProviderServiceFormValues } from '@interfaces/services'
import AppButton from '@components/ui/AppButton'
import AppFormItem from '@components/ui/AppFormItem'
import AppInput from '@components/ui/AppInput'
import { PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE } from './constants'
import ProviderServiceFormCategory from './ProviderServiceFormCategory'
import ProviderServiceFormDuration from './ProviderServiceFormDuration'
import ProviderServiceFormImage from './ProviderServiceFormImage'

type Props = AppFormProps<ProviderServiceFormValues> & {
  form: FormInstance
  closeModal: () => void
}

const ProviderServiceForm: React.FC<Props> = ({ formik, form, closeModal }) => {
  const requiredRuleSet = useFormItemRules('required')
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')
  const inputNumberPositiveRuleSet = useFormItemRules('positiveNumber')

  const onCancelButtonClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    formik.resetForm()
    closeModal()
  }, [closeModal, formik])

  return (
    <Form
      form={form}
      requiredMark={true}
      className='w-full flex flex-col gap-4 mt-4!'
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <AppFormItem name='title' label='Title' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='firstName'
          value={formik.values.name}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
        />
      </AppFormItem>
      <AppFormItem name='duration' label='Duration' rules={requiredRuleSet}>
        {/* <InputNumber
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
          addonAfter='minutes'
        /> */}
        <ProviderServiceFormDuration formik={formik} form={form} />
      </AppFormItem>

      <AppFormItem name='description' label='Description' rules={textareaMaxCharsCountRuleSet}>
        <TextArea
          name='description'
          value={formik.values.description}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </AppFormItem>
      <AppFormItem name='price' label='Price' rules={inputNumberPositiveRuleSet}>
        <InputNumber
          value={formik.values.price}
          size='large'
          onChange={formik.handleChange}
          className='w-full!'
          disabled={formik.isSubmitting}
        />
      </AppFormItem>
      <AppFormItem name='currency' label='Currency'>
        <Select
          value={formik.values.currency}
          size='large'
          onChange={formik.handleChange}
          options={PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE}
          disabled={formik.isSubmitting}
        />
      </AppFormItem>
      <AppFormItem name='categoryId' label='Category'>
        <ProviderServiceFormCategory form={form} formik={formik} />
      </AppFormItem>
      <AppFormItem name='image' label='Image'>
        <ProviderServiceFormImage formik={formik} />
      </AppFormItem>
      <Flex justify='end' gap={8} className='mt-4!'>
        <AppButton
          variant='solid'
          size='large'
          className='grow'
          disabled={formik.isSubmitting}
          onClick={onCancelButtonClick}
        >
          Close
        </AppButton>
        <AppButton type='primary' variant='solid' htmlType='submit' className='grow' loading={formik.isSubmitting}>
          Save
        </AppButton>
      </Flex>
    </Form>
  )
}

export default ProviderServiceForm

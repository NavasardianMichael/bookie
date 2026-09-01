'use client'

import React, { useCallback } from 'react'
import { Col, Flex, Form, FormInstance, Input, InputNumber, Row, Select } from 'antd'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { AppFormProps } from '@interfaces/forms'
import { ProviderServiceFormValues } from '@interfaces/services'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE } from './constants'
import { ProviderServiceFormCategory } from './ProviderServiceFormCategory'
import { ProviderServiceFormDuration } from './ProviderServiceFormDuration'
import { ProviderServiceFormImage } from './ProviderServiceFormImage'

type Props = AppFormProps<ProviderServiceFormValues> & {
  form: FormInstance
  closeModal: () => void
}

export const ProviderServiceForm: React.FC<Props> = ({ formik, form, closeModal }) => {
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
      className='mt-4 flex w-full flex-col gap-4'
      layout='vertical'
      validateTrigger='onSubmit'
      onFinish={formik.handleSubmit}
      scrollToFirstError
    >
      <AppFormItem name='name' label='Title' rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput
          name='name'
          value={formik.values.name}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          autoComplete='off'
          enterKeyHint='next'
        />
      </AppFormItem>

      <AppFormItem name='description' label='Description' rules={textareaMaxCharsCountRuleSet}>
        <Input.TextArea
          name='description'
          value={formik.values.description}
          onChange={formik.handleChange}
          disabled={formik.isSubmitting}
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </AppFormItem>

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <AppFormItem name='duration' label='Duration' rules={requiredRuleSet}>
            <ProviderServiceFormDuration formik={formik} form={form} />
          </AppFormItem>
        </Col>
        <Col xs={24} sm={12}>
          <AppFormItem name='categoryId' label='Category'>
            <ProviderServiceFormCategory form={form} formik={formik} />
          </AppFormItem>
        </Col>
      </Row>

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <AppFormItem name='price' label='Price' rules={inputNumberPositiveRuleSet}>
            <InputNumber
              value={formik.values.price}
              onChange={(value) => formik.setFieldValue('price', value)}
              className='w-full'
              disabled={formik.isSubmitting}
              inputMode='decimal'
            />
          </AppFormItem>
        </Col>
        <Col xs={24} sm={12}>
          <AppFormItem name='currency' label='Currency'>
            <Select
              value={formik.values.currency}
              onChange={(value) => formik.setFieldValue('currency', value)}
              options={PROVIDER_SERVICE_FORM_CURRENCY_TEMPLATE}
              disabled={formik.isSubmitting}
              className='w-full'
            />
          </AppFormItem>
        </Col>
      </Row>

      <AppFormItem name='image' label='Image'>
        <ProviderServiceFormImage formik={formik} />
      </AppFormItem>

      <Flex justify='end' gap={8} className='mt-4'>
        <AppButton
          variant='solid'
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

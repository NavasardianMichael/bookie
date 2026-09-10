'use client'

import React from 'react'
import { Col, Flex, Form, InputNumber, Row } from 'antd'
import type { Rule } from 'antd/es/form'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { CategoryValue, ProviderServiceFormValues } from '@interfaces/services'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { ProviderServiceFormCategory } from './ProviderServiceFormCategory'
import { ProviderServiceFormCurrency } from './ProviderServiceFormCurrency'
import { ProviderServiceFormDuration } from './ProviderServiceFormDuration'
import { ProviderServiceFormImage } from './ProviderServiceFormImage'

type Props = {
  initialValues: ProviderServiceFormValues
  isSubmitting: boolean
  onSubmit: (values: ProviderServiceFormValues) => void
  closeModal: () => void
}

/**
 * antd's `Form` is the only owner of these values. No field carries its own
 * `value`/`onChange`: `Field` clones each child with the store's value last, so a
 * second binding would win the render and lose the submit.
 */
export const ProviderServiceForm: React.FC<Props> = ({ initialValues, isSubmitting, onSubmit, closeModal }) => {
  const t = useTranslations('Services')
  const tCommon = useTranslations('Common')
  const tActions = useTranslations('Settings.actions')
  const [form] = Form.useForm<ProviderServiceFormValues>()
  const requiredRuleSet = useFormItemRules('required')
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')
  const inputNumberPositiveRuleSet = useFormItemRules('positiveNumber')
  const currencyMaxCharsRuleSet = useFormItemRules('maxCharsForInput')

  const categoryRules: Rule[] = [
    {
      validator: async (_rule, value: CategoryValue | undefined) => {
        const name = value?.name?.trim() ?? ''
        if (!value?.id && !name) throw new Error('Please fill in Category')
        if (name.length > 40) throw new Error('Max count of characters is 40')
      },
    },
  ]

  return (
    <Form<ProviderServiceFormValues>
      form={form}
      initialValues={initialValues}
      requiredMark
      className='mt-4 flex w-full flex-col gap-4'
      layout='vertical'
      onFinish={onSubmit}
      scrollToFirstError
      disabled={isSubmitting}
    >
      <AppFormItem name='name' label={t('formTitle')} rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput autoComplete='off' enterKeyHint='next' />
      </AppFormItem>

      <AppFormItem name='description' label={t('formDescription')} rules={textareaMaxCharsCountRuleSet}>
        <AppTextArea autoSize={{ minRows: 3, maxRows: 5 }} maxLength={MAX_CHARS_FOR_TEXTAREA} />
      </AppFormItem>

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <AppFormItem name='duration' label={t('formDuration')} rules={requiredRuleSet}>
            <ProviderServiceFormDuration />
          </AppFormItem>
        </Col>
        <Col xs={24} sm={12}>
          {/* Combobox: pick a predefined Category or type a new name. `Service.categoryId`
              is still a required FK — the server matches or creates the row. */}
          <AppFormItem name='category' label={t('formCategory')} rules={categoryRules} required>
            <ProviderServiceFormCategory />
          </AppFormItem>
        </Col>
      </Row>

      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12}>
          <AppFormItem name='price' label={t('formPrice')} rules={inputNumberPositiveRuleSet}>
            {/* antd sizes this from `controlWidth` (90px). That rule is unlayered, so
                Tailwind `w-full` cannot override it — `styles.root` can. */}
            <InputNumber min={0} inputMode='decimal' styles={{ root: { width: '100%' } }} />
          </AppFormItem>
        </Col>
        <Col xs={24} sm={12}>
          <AppFormItem name='currency' label={t('formCurrency')} rules={currencyMaxCharsRuleSet}>
            <ProviderServiceFormCurrency />
          </AppFormItem>
        </Col>
      </Row>

      <AppFormItem name='image' label={t('formImage')}>
        <ProviderServiceFormImage />
      </AppFormItem>

      <Flex justify='end' gap={8} className='mt-4'>
        <AppButton type='default' className='grow' onClick={closeModal}>
          {tCommon('close')}
        </AppButton>
        <AppButton type='primary' htmlType='submit' className='grow' loading={isSubmitting}>
          {tActions('save')}
        </AppButton>
      </Flex>
    </Form>
  )
}

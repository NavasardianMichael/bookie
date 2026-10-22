'use client'

import React from 'react'
import { Flex, Form, InputNumber } from 'antd'
import { useTranslations } from 'next-intl'
import { WeekSchedule } from '@store/providers/profile/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { useFormUnsavedGuard } from '@hooks/useUnsavedChangesGuard'
import { TimeFormat } from '@interfaces/schedule'
import { ProviderServiceFormValues } from '@interfaces/services'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppTextArea } from '@components/ui/AppTextArea'
import { ProviderServiceFormAvailability } from './ProviderServiceFormAvailability'
import { ProviderServiceFormCurrency } from './ProviderServiceFormCurrency'
import { ProviderServiceFormDuration } from './ProviderServiceFormDuration'
import { ProviderServiceFormImage } from './ProviderServiceFormImage'

type Props = {
  initialValues: ProviderServiceFormValues
  isSubmitting: boolean
  onSubmit: (values: ProviderServiceFormValues) => void
  closeModal: () => void
  /** The provider's published hours, zone and clock — the frame the availability section works inside. */
  weekSchedule?: WeekSchedule
  timeZone?: string
  timeFormat: TimeFormat
  /**
   * Offer the photo field — on by default. The profile assistant's review turns it off: its
   * apply is one JSON write, and a photo is added on the Services tab afterwards.
   */
  withImage?: boolean
}

/**
 * antd's `Form` is the only owner of these values. No field carries its own
 * `value`/`onChange`: `Field` clones each child with the store's value last, so a
 * second binding would win the render and lose the submit.
 */
export const ProviderServiceForm: React.FC<Props> = ({
  initialValues,
  isSubmitting,
  onSubmit,
  closeModal,
  weekSchedule,
  timeZone,
  timeFormat,
  withImage = true,
}) => {
  const t = useTranslations('Services')
  const tCommon = useTranslations('Common')
  const tActions = useTranslations('Settings.actions')
  const [form] = Form.useForm<ProviderServiceFormValues>()
  const unsaved = useFormUnsavedGuard()
  const requiredRuleSet = useFormItemRules('required')
  const inputTextRequiredMaxCharsCountRuleSet = useFormItemRules('required', 'maxCharsForInput')
  const textareaMaxCharsCountRuleSet = useFormItemRules('maxCharsForTextarea')
  const inputNumberPositiveRuleSet = useFormItemRules('positiveNumber')
  const currencyMaxCharsRuleSet = useFormItemRules('maxCharsForInput')

  return (
    <Form<ProviderServiceFormValues>
      form={form}
      initialValues={initialValues}
      requiredMark
      className='mt-4 flex min-w-0 w-full flex-col gap-4 [&_.ant-form-item-label>label]:font-semibold'
      layout='vertical'
      onFinish={onSubmit}
      onValuesChange={unsaved.mark}
      scrollToFirstError
      disabled={isSubmitting}
    >
      <AppFormItem name='name' label={t('formTitle')} rules={inputTextRequiredMaxCharsCountRuleSet}>
        <AppInput autoComplete='off' enterKeyHint='next' />
      </AppFormItem>

      <AppFormItem name='description' label={t('formDescription')} rules={textareaMaxCharsCountRuleSet}>
        <AppTextArea autoSize={{ minRows: 3, maxRows: 5 }} maxLength={MAX_CHARS_FOR_TEXTAREA} />
      </AppFormItem>

      {/* CSS grid, not antd `Row`/`Col`: Row's gutter applies negative inline margins,
          which made this sheet 16px wider than the modal body and produced a horizontal
          scrollbar. Grid gap does the same layout without overflowing. */}
      <div className='grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-4'>
        <AppFormItem name='duration' label={t('formDuration')} rules={requiredRuleSet} hasFeedback={false} className='min-w-0'>
          <ProviderServiceFormDuration />
        </AppFormItem>
        <AppFormItem
          name='price'
          label={t('formPrice')}
          rules={inputNumberPositiveRuleSet}
          hasFeedback={false}
          className='min-w-0'
        >
          {/* antd sizes this from `controlWidth` (90px). That rule is unlayered, so
              Tailwind `w-full` cannot override it — `styles.root` can. */}
          <InputNumber min={0} inputMode='decimal' styles={{ root: { width: '100%' } }} />
        </AppFormItem>
        <AppFormItem name='currency' label={t('formCurrency')} rules={currencyMaxCharsRuleSet} hasFeedback={false} className='min-w-0'>
          <ProviderServiceFormCurrency />
        </AppFormItem>
      </div>

      {withImage && (
        <AppFormItem name='image' label={t('formImage')} hasFeedback={false} className='min-w-0'>
          <ProviderServiceFormImage />
        </AppFormItem>
      )}

      <ProviderServiceFormAvailability weekSchedule={weekSchedule} timeZone={timeZone} timeFormat={timeFormat} />

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

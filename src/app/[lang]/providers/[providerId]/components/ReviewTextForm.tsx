'use client'

import { FC } from 'react'
import { Form } from 'antd'
import { useTranslations } from 'next-intl'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppTextArea } from '@components/ui/AppTextArea'

export type ReviewTextFormValues = { text: string }

type Props = {
  label: string
  placeholder?: string
  submitLabel: string
  initialValues?: ReviewTextFormValues
  isSubmitting: boolean
  onSubmit: (values: ReviewTextFormValues) => Promise<void>
  onCancel: () => void
}

/**
 * One required textarea and a submit — the report reason and the provider's reply are
 * the same shape, so they share a form rather than each growing their own copy.
 *
 * Mounts and unmounts with its `AppSheet`, as `ReviewForm` does, which is what clears
 * both the values and any error state between opens.
 */
export const ReviewTextForm: FC<Props> = ({
  label,
  placeholder,
  submitLabel,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const tCommon = useTranslations('Common')
  const [form] = Form.useForm<ReviewTextFormValues>()
  const rules = useFormItemRules('required', 'maxCharsForTextarea')

  return (
    <Form
      form={form}
      initialValues={initialValues}
      layout='vertical'
      onFinish={onSubmit}
      scrollToFirstError
      disabled={isSubmitting}
      className='flex w-full flex-col gap-6'
    >
      <AppFormItem name='text' label={label} rules={rules}>
        {/* `maxLength` pairs with `maxCharsForTextarea` above: the counter and the rule
            must share a number, and both match the server's own cap. */}
        <AppTextArea rows={4} maxLength={MAX_CHARS_FOR_TEXTAREA} placeholder={placeholder} />
      </AppFormItem>

      <div className='flex justify-end gap-2'>
        <AppButton onClick={onCancel} disabled={isSubmitting}>
          {tCommon('cancel')}
        </AppButton>
        <AppButton type='primary' htmlType='submit' loading={isSubmitting}>
          {submitLabel}
        </AppButton>
      </div>
    </Form>
  )
}

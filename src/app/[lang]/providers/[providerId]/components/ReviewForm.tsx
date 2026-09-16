'use client'

import { FC } from 'react'
import { Form, Rate } from 'antd'
import { useTranslations } from 'next-intl'
import { MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppTextArea } from '@components/ui/AppTextArea'

export type ReviewFormValues = {
  rating: number
  comment?: string
}

type Props = {
  initialValues?: ReviewFormValues
  isSubmitting: boolean
  submitLabel: string
  onSubmit: (values: ReviewFormValues) => Promise<void>
  onCancel: () => void
}

/**
 * The rating + comment form, split out from its sheet on purpose.
 *
 * `AppSheet` renders with `destroyOnHidden`, so this component mounts and unmounts with
 * the sheet — which is what resets `Form.useForm` state between opens without an explicit
 * `resetFields`, and why the parent must never reach in with `setFieldsValue` (that
 * instance is disconnected while the sheet is closed). `initialValues` plus a `key` on
 * the parent is how an edit loads its values.
 */
export const ReviewForm: FC<Props> = ({ initialValues, isSubmitting, submitLabel, onSubmit, onCancel }) => {
  const t = useTranslations('Provider.reviews')
  const tCommon = useTranslations('Common')
  const [form] = Form.useForm<ReviewFormValues>()

  return (
    <Form
      form={form}
      initialValues={initialValues ?? { rating: 0 }}
      layout='vertical'
      onFinish={onSubmit}
      scrollToFirstError
      className='flex w-full flex-col gap-6'
    >
      {/*
        An inline rule rather than `useFormItemRules('required')`: antd's `required`
        treats `0` as present, and `0` is exactly what an untouched `Rate` holds. A
        submitted form with no stars would otherwise POST a rating the API rejects.
      */}
      <AppFormItem
        name='rating'
        label={t('ratingLabel')}
        rules={[{ validator: (_, value) => (value >= 1 ? Promise.resolve() : Promise.reject(new Error(t('ratingRequired')))) }]}
      >
        {/*
          antd's `Rate` already implements the control contract — it takes `value` and
          `onChange` — so it is the direct child of the named Form.Item with no wrapper.
          Wrapping it would land the injected props on a div.

          `allowClear={false}`: clicking the chosen star again would otherwise silently
          reset to 0, which reads as a misclick rather than as clearing.
        */}
        <Rate allowClear={false} />
      </AppFormItem>

      <AppFormItem name='comment' label={t('commentLabel')}>
        {/* `maxLength` matches the cap `parseReviewBody` enforces on the server; without
            it the counter and the validation would disagree. */}
        <AppTextArea rows={4} maxLength={MAX_CHARS_FOR_TEXTAREA} placeholder={t('commentPlaceholder')} />
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

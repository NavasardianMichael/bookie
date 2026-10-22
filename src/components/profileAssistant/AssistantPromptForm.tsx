'use client'

import { FC, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { generateProfileAssistantAPI } from '@api/profileAssistant/main'
import { AssistantProposal } from '@api/profileAssistant/types'
import { useFormUnsavedGuard } from '@hooks/useUnsavedChangesGuard'
import { ASSISTANT_PROMPT_MAX } from '@constants/profileAssistant'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { AssistantPlanAction } from './AssistantPlanAction'

type FormValues = {
  description: string
}

type Props = {
  /** What was typed last time, so "Edit description" from the review keeps it. */
  initialDescription: string
  /** Whether the provider already has services — then the hint about describing only changes shows. */
  hasWorkspace: boolean
  /** `profileAssistantRunsPerDay`; `null` (unlimited) or not yet known says nothing. */
  dailyLimit: number | null
  onPendingChange: (pending: boolean) => void
  onDrafted: (description: string, proposal: AssistantProposal) => void
}

const INPUT_ID = 'profile-assistant-description'

/**
 * Step one: the provider's own words about their business, in any language. Owns the call to
 * the model, as photo import's pick form owns its read; the proposal goes up to the flow, which
 * swaps in the review.
 */
export const AssistantPromptForm: FC<Props> = ({
  initialDescription,
  hasWorkspace,
  dailyLimit,
  onPendingChange,
  onDrafted,
}) => {
  const t = useTranslations('Settings.assistant')
  const locale = useLocale()
  const [form] = Form.useForm<FormValues>()
  const unsaved = useFormUnsavedGuard()
  const [drafting, setDrafting] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const handleFinish = async ({ description }: FormValues): Promise<void> => {
    setDrafting(true)
    onPendingChange(true)
    setError(null)
    try {
      const text = description.trim()
      onDrafted(text, await generateProfileAssistantAPI({ description: text, locale }))
    } catch (reason) {
      setError(reason)
    } finally {
      setDrafting(false)
      onPendingChange(false)
    }
  }

  return (
    <Form<FormValues>
      form={form}
      layout='vertical'
      requiredMark={false}
      initialValues={{ description: initialDescription }}
      onFinish={handleFinish}
      onValuesChange={unsaved.mark}
      disabled={drafting}
      className='flex w-full flex-col gap-5'
    >
      <AppParagraph size='body-sm' className='m-0'>
        {t('intro')}
      </AppParagraph>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor={INPUT_ID} requirement='Required'>
          {t('descriptionLabel')}
        </FieldLabel>
        {/* `maxLength` and the rule are a pair — the counter reads one, validation the other. */}
        <AppFormItem
          name='description'
          rules={[
            { required: true, whitespace: true, message: t('descriptionRequired') },
            { max: ASSISTANT_PROMPT_MAX },
          ]}
          messageVariables={{ label: t('descriptionLabel') }}
          // The counter hangs one line under the box. This keeps an error below it.
          className='[&_.ant-form-item-additional]:pt-6'
        >
          <AppTextArea
            id={INPUT_ID}
            autoSize={{ minRows: 6, maxRows: 12 }}
            maxLength={ASSISTANT_PROMPT_MAX}
            showCount
            placeholder={t('descriptionPlaceholder')}
          />
        </AppFormItem>
        {hasWorkspace && (
          <AppParagraph size='caption' className='m-0'>
            {t('adjustHint')}
          </AppParagraph>
        )}
      </div>

      {dailyLimit !== null && (
        <AppParagraph size='caption' tone='muted' className='m-0'>
          {t('dailyLimit', { count: dailyLimit })}
        </AppParagraph>
      )}

      {error !== null && (
        <ErrorAlert
          error={error}
          onRetry={() => form.submit()}
          retrying={drafting}
          action={<AssistantPlanAction error={error} />}
        />
      )}

      <div className='flex flex-col gap-2'>
        <AppButton htmlType='submit' type='primary' loading={drafting} className='w-full'>
          {t('generate')}
        </AppButton>
        {drafting && (
          <AppParagraph size='body-sm' tone='muted' className='m-0 text-center' aria-live='polite'>
            {t('generating')}
          </AppParagraph>
        )}
      </div>
    </Form>
  )
}

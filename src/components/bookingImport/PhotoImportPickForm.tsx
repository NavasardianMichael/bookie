'use client'

import { FC, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Form } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { parseBookingPhotoAPI } from '@api/bookingImport/main'
import { BookingDraft } from '@api/bookingImport/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { IMPORT_NOTE_MAX, IMPORT_PHOTO_MAX_EDGE } from '@constants/bookingImport'
import { downscaleImage } from '@helpers/imageResize'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PhotoPickField } from './PhotoPickField'
import { PlanLimitAction } from './PlanLimitAction'

export type PhotoPickValues = {
  photo?: File | null
  note?: string
}

type Props = {
  /** What was picked last time, so "Try another photo" keeps the note. */
  initialValues: PhotoPickValues
  /** `Entitlements.photoImportsPerDay`; `null` (unlimited) or not yet known says nothing. */
  dailyLimit: number | null
  onPendingChange: (pending: boolean) => void
  onRead: (values: PhotoPickValues, drafts: BookingDraft[]) => void
}

/**
 * Step one: the photo, an optional note for the reader, and the one line about where the
 * photo goes. Owns the read itself — downscale, upload, wait — because only this step knows
 * the photo; the drafts go up to the sheet, which swaps in the review.
 */
export const PhotoImportPickForm: FC<Props> = ({ initialValues, dailyLimit, onPendingChange, onRead }) => {
  const t = useTranslations('Bookings.import')
  const locale = useLocale()
  const [form] = Form.useForm<PhotoPickValues>()
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const noteRules = useFormItemRules('maxCharsForTextarea')

  const handleFinish = async (values: PhotoPickValues) => {
    if (!values.photo) return
    setReading(true)
    onPendingChange(true)
    setError(null)
    try {
      const image = await downscaleImage(values.photo, IMPORT_PHOTO_MAX_EDGE)
      const drafts = await parseBookingPhotoAPI({ image, note: values.note?.trim() || undefined, locale })
      onRead(values, drafts)
    } catch (reason) {
      setError(reason)
    } finally {
      setReading(false)
      onPendingChange(false)
    }
  }

  return (
    <Form
      form={form}
      layout='vertical'
      requiredMark={false}
      initialValues={initialValues}
      onFinish={handleFinish}
      disabled={reading}
      className='flex w-full flex-col gap-6'
    >
      <AppParagraph size='body-sm' className='m-0'>
        {t('intro')}
      </AppParagraph>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='import-photo' requirement='Required'>
          {t('photoLabel')}
        </FieldLabel>
        <AppFormItem
          name='photo'
          rules={[{ required: true, message: t('photoRequired') }]}
          messageVariables={{ label: t('photoLabel') }}
        >
          <PhotoPickField id='import-photo' />
        </AppFormItem>
      </div>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='import-note' requirement='Optional'>
          {t('noteLabel')}
        </FieldLabel>
        {/* `maxLength` and the rule are a pair — the counter reads one, validation the other. */}
        <AppFormItem name='note' rules={noteRules} messageVariables={{ label: t('noteLabel') }}>
          <AppTextArea
            id='import-note'
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={IMPORT_NOTE_MAX}
            placeholder={t('notePlaceholder')}
          />
        </AppFormItem>
      </div>

      <div className='flex flex-col gap-1'>
        <AppParagraph size='caption' tone='muted' className='m-0'>
          {t('privacy')}
        </AppParagraph>
        {dailyLimit !== null && (
          <AppParagraph size='caption' tone='muted' className='m-0'>
            {t('dailyLimit', { count: dailyLimit })}
          </AppParagraph>
        )}
      </div>

      {error !== null && (
        <ErrorAlert error={error} onRetry={() => form.submit()} retrying={reading} action={<PlanLimitAction error={error} />} />
      )}

      <div className='flex flex-col gap-2'>
        <AppButton htmlType='submit' type='primary' loading={reading} className='w-full'>
          {t('read')}
        </AppButton>
        {reading && (
          <AppParagraph size='body-sm' tone='muted' className='m-0 text-center' aria-live='polite'>
            {t('reading')}
          </AppParagraph>
        )}
      </div>
    </Form>
  )
}

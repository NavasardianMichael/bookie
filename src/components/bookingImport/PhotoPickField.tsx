'use client'

import { FC, useEffect, useMemo } from 'react'
import { CameraOutlined } from '@ant-design/icons'
import { Image, Upload } from 'antd'
import { useTranslations } from 'next-intl'
import { IMPORT_PHOTO_ACCEPT } from '@constants/bookingImport'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  /** The photo picked, until it is read. */
  value?: File | null
  onChange?: (next: File | null) => void
  id: string
  /** Injected by the wrapping `Form.Item` when the form is disabled. */
  disabled?: boolean
}

/**
 * The photo of the provider's paper bookings, as a `Form.Item` control.
 *
 * No `capture` attribute: a phone then offers both the camera and the gallery, and a sheet
 * photographed earlier is as likely as one photographed now. `customRequest` hands the file
 * to the form instead of uploading it — the form sends it when the provider asks for the
 * read, after `downscaleImage`.
 *
 * The preview is antd's `Image`, whose click-to-zoom is how the provider checks the
 * handwriting is legible before spending a read on it.
 */
export const PhotoPickField: FC<Props> = ({ value, onChange, id, disabled }) => {
  const t = useTranslations('Bookings.import')
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : undefined), [value])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  return (
    <div className='flex flex-col items-start gap-3'>
      {previewUrl && (
        <Image
          src={previewUrl}
          alt={t('photoAlt')}
          className='rounded-brand-sm max-h-60 w-auto object-contain'
        />
      )}
      <Upload
        accept={IMPORT_PHOTO_ACCEPT}
        maxCount={1}
        showUploadList={false}
        disabled={disabled}
        customRequest={({ file }) => {
          if (file instanceof File) onChange?.(file)
        }}
      >
        <AppButton id={id} icon={<CameraOutlined />} disabled={disabled}>
          {value ? t('photoChange') : t('photoPick')}
        </AppButton>
      </Upload>
    </div>
  )
}

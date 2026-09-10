'use client'

import { useEffect, useMemo } from 'react'
import { DeleteOutlined, RedoOutlined, UploadOutlined } from '@ant-design/icons'
import { Flex, Image, Upload } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { useTranslations } from 'next-intl'
import { AppButton } from '@components/ui/AppButton'

/**
 * Injected by `Form.Item`. The value is a `File` between the crop and the save, and the
 * stored `/uploads/...` path afterwards — the API layer decides the transport by checking
 * for a real `File`.
 */
type Props = {
  value?: string | File
  onChange?: (next: string | File | undefined) => void
  disabled?: boolean
}

export const ProviderProfileImage: React.FC<Props> = ({ value, onChange, disabled }) => {
  const t = useTranslations('ProfileCreation')
  const tAvailability = useTranslations('Settings.availability')

  /**
   * Derived, never mirrored into state: `react-hooks/set-state-in-effect` is an **error**
   * in this repo, and a `setPreviewUrl` in an effect would also let the preview lag a
   * render behind what will actually be submitted.
   */
  const previewUrl = useMemo(
    () => (value instanceof File ? URL.createObjectURL(value) : typeof value === 'string' ? value : undefined),
    [value]
  )

  // The effect only cleans up. Without it every re-crop leaks a blob for the life of the
  // page; with it, the URL dies exactly when `value` moves on.
  useEffect(() => {
    if (!(value instanceof File) || !previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [value, previewUrl])

  const onModalOk: ImgCropProps['onModalOk'] = (file) => {
    onChange?.(file instanceof File ? file : undefined)
  }

  return (
    <>
      <Flex gap={8} wrap>
        <ImgCrop aspect={1} onModalOk={onModalOk}>
          {/*
            `customRequest` is a no-op so antd does not POST the file on its own — the form
            submit carries it. Deliberately **not** `beforeUpload={() => false}`:
            `antd-img-crop` resolves its crop promise with whatever `beforeUpload` returned
            and passes that to `onModalOk`, so `false` would arrive where the cropped
            `File` was expected and the image would be silently dropped.
          */}
          <Upload maxCount={1} showUploadList={false} disabled={disabled} customRequest={() => undefined}>
            <AppButton icon={value ? <RedoOutlined /> : <UploadOutlined />} disabled={disabled}>
              {value ? t('uploadAnother') : t('upload')}
            </AppButton>
          </Upload>
        </ImgCrop>

        {previewUrl && (
          <AppButton
            danger
            icon={<DeleteOutlined />}
            color='red'
            onClick={() => onChange?.(undefined)}
            disabled={disabled}
          >
            {tAvailability('removeRange')}
          </AppButton>
        )}
      </Flex>

      {previewUrl && (
        <Image className='mt-6 mx-auto max-w-80 block!' alt={t('profilePicture')} preview={false} src={previewUrl} />
      )}
    </>
  )
}

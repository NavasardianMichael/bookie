'use client'

import { FC, useEffect, useMemo } from 'react'
import { DeleteOutlined, RedoOutlined, UploadOutlined } from '@ant-design/icons'
import { Flex, Image, Upload } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { resolveAssetUrl } from '@helpers/images'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  /**
   * A `File` while the crop is fresh, the stored `/uploads/...` path once saved.
   * Injected by the wrapping `Form.Item`.
   */
  value?: string | File
  onChange?: (next: string | File | undefined) => void
  disabled?: boolean
}

export const ProviderServiceFormImage: FC<Props> = ({ value, onChange, disabled }) => {
  const isFile = typeof File !== 'undefined' && value instanceof File

  // A fresh crop is only previewable through a blob URL, and that URL owns memory until
  // it is revoked — so it is derived from `value` and released whenever `value` moves on.
  const previewUrl = useMemo(
    () => (isFile ? URL.createObjectURL(value as File) : resolveAssetUrl(value as string | undefined)),
    [isFile, value]
  )

  useEffect(() => {
    if (!isFile || !previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [isFile, previewUrl])

  // ImgCrop types this as `File | boolean | Error | void` because it forwards whatever
  // the child's `beforeUpload` resolved. With none set, it is always the cropped File.
  const onModalOk: ImgCropProps['onModalOk'] = (file) => {
    onChange?.(file instanceof File ? file : undefined)
  }

  const onRemovePictureClick = (): void => {
    onChange?.(undefined)
  }

  return (
    <>
      <Flex gap={8} wrap>
        <ImgCrop aspect={1} onModalOk={onModalOk}>
          {/* A no-op `customRequest` is what stops antd POSTing the file on its own — the
              cropped File travels with the form submit instead. It must not be
              `beforeUpload={() => false}`: ImgCrop resolves its crop promise with that
              `false` and hands it straight to `onModalOk`, losing the File. */}
          <Upload maxCount={1} showUploadList={false} disabled={disabled} customRequest={() => undefined}>
            <AppButton icon={value ? <RedoOutlined /> : <UploadOutlined />} disabled={disabled}>
              {value ? 'Upload another picture' : 'Upload'}
            </AppButton>
          </Upload>
        </ImgCrop>
        {previewUrl && (
          <AppButton danger icon={<DeleteOutlined />} onClick={onRemovePictureClick} disabled={disabled}>
            Remove
          </AppButton>
        )}
      </Flex>
      {previewUrl && (
        <div className='mt-6 flex justify-center'>
          <Image className='max-w-80' alt='Service picture' preview={false} src={previewUrl} />
        </div>
      )}
    </>
  )
}

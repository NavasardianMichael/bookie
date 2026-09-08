'use client'

import { FC, useEffect, useMemo } from 'react'
import { UploadOutlined } from '@ant-design/icons'
import { Upload } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { resolveAssetUrl } from '@helpers/images'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'

type Props = {
  /** A `File` between the crop and the save, the stored path once the API has it. */
  value?: string | File
  onChange?: (next: string | File | undefined) => void
  name: string
  hint: string
  uploadLabel: string
}

/**
 * Avatar + crop-to-upload for the provider profile settings form.
 *
 * Implements the `Form.Item` control contract. The previous settings page stored the
 * cropped `File` with `setFieldValue` on a name that had no `Form.Item`, so
 * `validateFields()` dropped it on Save draft and the live portrait came back.
 *
 * A no-op `customRequest` stops antd POSTing the file on its own. It must not be
 * `beforeUpload={() => false}`: ImgCrop resolves its crop promise with that `false`
 * and the File never lands on `onChange`.
 */
export const ProfilePhotoField: FC<Props> = ({ value, onChange, name, hint, uploadLabel }) => {
  const isFile = typeof File !== 'undefined' && value instanceof File
  const previewUrl = useMemo(
    () => (isFile ? URL.createObjectURL(value) : resolveAssetUrl(typeof value === 'string' ? value : undefined)),
    [isFile, value]
  )

  useEffect(() => {
    if (!isFile || !previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [isFile, previewUrl])

  const onModalOk: ImgCropProps['onModalOk'] = (file) => {
    if (file instanceof File) {
      onChange?.(file)
      return
    }
    // ImgCrop types allow a Blob from canvas.toBlob; multer only accepts a File.
    if (typeof Blob !== 'undefined' && file instanceof Blob) {
      onChange?.(new File([file], 'profile.jpg', { type: file.type || 'image/jpeg' }))
    }
  }

  return (
    <div className='border-brand-border flex flex-wrap items-center gap-6 border-b pb-6'>
      <AppAvatar src={previewUrl} name={name} size={80} />
      <div className='flex flex-col gap-2'>
        <AppParagraph size='body-sm'>{hint}</AppParagraph>
        <ImgCrop aspect={1} onModalOk={onModalOk}>
          <Upload maxCount={1} showUploadList={false} customRequest={() => undefined}>
            <AppButton icon={<UploadOutlined />}>{uploadLabel}</AppButton>
          </Upload>
        </ImgCrop>
      </div>
    </div>
  )
}

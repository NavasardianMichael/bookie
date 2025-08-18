'use client'

import { useState } from 'react'
import { DeleteOutlined, RedoOutlined, UploadOutlined } from '@ant-design/icons'
import { Flex, Image, Upload } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { AppFormProps } from '@interfaces/forms'
import { ProviderProfileFormValues } from '@interfaces/providers'
import AppButton from '@components/ui/AppButton'

type Props = AppFormProps<ProviderProfileFormValues>

const ProviderProfileImage: React.FC<Props> = ({ formik }) => {
  const [previewImage, setPreviewImage] = useState(formik.values.image)

  const onModalOk: ImgCropProps['onModalOk'] = async (file) => {
    if (!file) {
      formik.setFieldValue('image', undefined)
      return
    }

    await formik.setFieldValue('image', file)

    const newFileURL = URL.createObjectURL(file as File)
    setPreviewImage(newFileURL)
  }

  const onRemovePictureClick = async () => {
    await formik.setFieldValue('image', undefined)
    setPreviewImage(undefined)
  }

  return (
    <>
      <Flex gap={8} wrap>
        <ImgCrop aspect={1} onModalOk={onModalOk}>
          <Upload maxCount={1} showUploadList={false} disabled={formik.isSubmitting}>
            <AppButton icon={formik.values.image ? <RedoOutlined /> : <UploadOutlined />} disabled={formik.isSubmitting}>
              {formik.values.image ? 'Upload another picture' : 'Upload'}
            </AppButton>
          </Upload>
        </ImgCrop>
        {
          previewImage && <AppButton danger icon={<DeleteOutlined />} color='red' onClick={onRemovePictureClick} disabled={formik.isSubmitting}>
            Remove
          </AppButton>
        }
      </Flex>
      {previewImage && (
        <Image
          wrapperClassName='block!'
          className='mt-6 mx-auto max-w-80'
          alt='Profile picture'
          preview={false}
          src={previewImage}
        />
      )}
    </>
  )
}

export default ProviderProfileImage

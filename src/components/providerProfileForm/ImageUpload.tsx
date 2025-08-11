'use client'

import { useEffect, useState } from 'react'
import { DeleteOutlined, RedoOutlined, UploadOutlined } from '@ant-design/icons'
import { Flex, Image, Upload, UploadFile } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { FormikProps } from 'formik'
import { ProviderProfileFormValues } from '@interfaces/providers'
import AppButton from '@components/ui/AppButton'

type Props = {
  formik: FormikProps<ProviderProfileFormValues>
}

const ImageUpload: React.FC<Props> = ({ formik }) => {
  const [previewImage, setPreviewImage] = useState(formik.values.image)
  const [localFiles, setLocalFiles] = useState<UploadFile[]>([])

  useEffect(() => {
    const imageURL = formik.values.image
    if (!imageURL) return

    const file: UploadFile = {
      uid: '1',
      name: 'Profile picture',
      url: formik.values.image,
    }
    setLocalFiles([file])
  }, [formik.values.image])

  // const handleChange: UploadProps['onChange'] = async ({ fileList }) => {}
  const onModalOk: ImgCropProps['onModalOk'] = async (file) => {
    if (!file) {
      formik.setFieldValue('image', undefined)
      return
    }

    const newFileURL = URL.createObjectURL(file as Blob | MediaSource)

    await formik.setFieldValue('image', newFileURL)
    setPreviewImage(newFileURL)
  }

  return (
    <>
      <ImgCrop aspect={1} onModalOk={onModalOk}>
        <Flex gap={8}>
          <Upload maxCount={1} fileList={localFiles} showUploadList={false}>
            <AppButton icon={formik.values.image ? <RedoOutlined /> : <UploadOutlined />}>
              {formik.values.image ? 'Upload another picture' : 'Upload'}
            </AppButton>
          </Upload>
          <AppButton danger icon={<DeleteOutlined />} color='red'>
            Remove
          </AppButton>
        </Flex>
      </ImgCrop>
      <Image
        wrapperStyle={{ display: 'block' }}
        className='mt-6 mx-auto max-w-80'
        alt='Profile picture'
        preview={false}
        src={previewImage}
      />
      {/* )} */}
    </>
  )
}

export default ImageUpload

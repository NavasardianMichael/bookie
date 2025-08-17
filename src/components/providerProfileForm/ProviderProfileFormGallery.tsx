'use client'

import { memo, useCallback, useState } from 'react'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { Flex, Image, Modal, Typography, Upload } from 'antd'
import ImgCrop, { ImgCropProps } from 'antd-img-crop'
import { ProviderProfile } from '@store/providers/profile/types'
import { AppFormProps } from '@interfaces/forms'
import { ProviderProfileFormValues } from '@interfaces/providers'
import AppButton from '@components/ui/AppButton'

type Props = AppFormProps<ProviderProfileFormValues>

const ProviderProfileFormGallery: React.FC<Props> = ({ formik }) => {
  const [previewImages, setPreviewImages] = useState(formik.values.gallery as ProviderProfile['details']['gallery'])
  const [pendingDeleteImageName, setPendingDeleteImageName] = useState<string | null>(null)

  const hideModal = useCallback(() => {
    setPendingDeleteImageName(null)
  }, [])

  const onModalOk = useCallback(
    async (arg: File | undefined) => {
      const file = arg
      if (!file) {
        formik.setFieldValue('gallery', [])
        setPreviewImages([])
        return
      }

      const newGallery: ProviderProfileFormValues['gallery'] = [...(formik.values?.gallery ?? []), file]
      await formik.setFieldValue('gallery', newGallery)

      const newFileURL = URL.createObjectURL(file)
      setPreviewImages((prev) => [...(prev ?? []), { name: `Uploaded picture${Date.now()}`, url: newFileURL }])
    },
    [formik]
  ) as ImgCropProps['onModalOk']

  const onApproveRemovePictureClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    const newGallery = formik.values.gallery?.filter((item) => item.name !== pendingDeleteImageName)
    await formik.setFieldValue('gallery', newGallery)
    setPreviewImages((prev) => prev?.filter((item) => item.name !== pendingDeleteImageName))
    hideModal()
  }, [formik, pendingDeleteImageName, hideModal])

  const onRemovePictureClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(async (event) => {
    const previewImageName = event.currentTarget.name
    if (!previewImageName) return
    setPendingDeleteImageName(previewImageName)
  }, [])

  return (
    <>
      <Flex gap={8} wrap>
        <ImgCrop aspect={1} onModalOk={onModalOk}>
          <Upload maxCount={10} showUploadList={false}>
            <AppButton icon={<UploadOutlined />} className='mr-2'>
              Upload
            </AppButton>
            up to 10 pictures to your gallery
          </Upload>
        </ImgCrop>
      </Flex>
      <Flex wrap gap={8}>
        {previewImages?.map(({ name, url }) => {
          return (
            <Flex key={name} vertical gap={4}>
              <Image
                wrapperClassName='block!'
                className='mt-6 mx-auto'
                alt='Profile picture'
                preview={false}
                src={url}
              />
              <AppButton danger icon={<DeleteOutlined />} color='red' onClick={onRemovePictureClick} name={name}>
                Remove
              </AppButton>
            </Flex>
          )
        })}
      </Flex>

      <Modal
        title='Modal'
        open={!!pendingDeleteImageName}
        onOk={onApproveRemovePictureClick}
        onCancel={hideModal}
        okText='Yes'
        cancelText='No'
        okButtonProps={{ danger: true }}
        centered
      >
        <Typography.Title level={5}>Are you sure you want to delete this image?</Typography.Title>
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  )
}

export default memo(ProviderProfileFormGallery)

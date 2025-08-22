'use client'

import React, { useCallback, useRef, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Flex, Modal, Typography } from 'antd'
import { useFormik } from 'formik'
import { useProviderProfileStore } from '@store/providers/profile/store'
import AppButton from '@components/ui/AppButton'

import '@ant-design/v5-patch-for-react-19'

const ProviderProfileServices: React.FC = () => {
  const { id: providerId, services, isPending, editProviderService, deleteProviderService } = useProviderProfileStore()
  const { allIds, byId } = services

  const [editServiceModalOpened, setEditServiceModalOpened] = useState(false)
  const editServicePropsRef = useRef<string | undefined>('')
  // const [tempEditService, setTempEditService] = useState<null | typeof byId[string]>(null)
  const [deleteServiceModalOpened, setDeleteServiceModalOpened] = useState(false)
  const deleteServicePropsRef = useRef<Parameters<typeof deleteProviderService>[0] | null>(null)

  const onDeleteServiceClick: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    const dataset = e.currentTarget.dataset
    const providerId = dataset.providerId
    const serviceId = dataset.serviceId
    if (!providerId || !serviceId) {
      console.error('Missing providerId or serviceId', { providerId, serviceId })
      return
    }
    deleteServicePropsRef.current = { providerId, serviceId }
    setDeleteServiceModalOpened(true)
  }, [])

  const closeDeleteServiceModal = useCallback(() => {
    setDeleteServiceModalOpened(false)
  }, [])

  const onDeleteServiceApprove: React.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    const props = deleteServicePropsRef.current
    if (props) await deleteProviderService(props)
    closeDeleteServiceModal()
  }, [closeDeleteServiceModal, deleteProviderService])

  const onEditServiceClick: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    const dataset = e.currentTarget.dataset
    const providerId = dataset.providerId
    editServicePropsRef.current = providerId
    setEditServiceModalOpened(true)
  }, [])

  const closeEditServiceModal = useCallback(() => {
    setEditServiceModalOpened(false)
  }, [])

  const onEditServiceApprove: React.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    const props = editServicePropsRef.current
    await editProviderService(props)
    closeEditServiceModal()
  }, [closeEditServiceModal, editProviderService])

  const formik = useFormik<typeof initialValues>({
    initialValues,
    validateOnChange: false,
    onSubmit: async (values) => {
      const payload = processProviderProfileFormToPostPayload(values)
      await putProviderProfileData(payload)
      push(ROUTES.providerProfileServices)
    },
  })

  return (
    <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
      <Flex vertical gap='middle' className='w-full'>
        {allIds.map((serviceId) => {
          const service = byId[serviceId]
          return (
            <Card
              key={service.id}
              loading={true}
              className='w-full'
              actions={[
                <Button
                  type='text'
                  icon={<EditOutlined />}
                  key='edit'
                  onClick={onEditServiceClick}
                  data-provider-id={providerId}
                  data-service-id={serviceId}
                />,
                <Button
                  type='text'
                  icon={<DeleteOutlined />}
                  key='delete'
                  danger
                  onClick={onDeleteServiceClick}
                  data-provider-id={providerId}
                  data-service-id={serviceId}
                />,
              ]}
            >
              <Card.Meta
                avatar={service.image ? <Avatar src={service.image} alt={service.name} /> : undefined}
                title={service.name}
                description={
                  <>
                    <p>{service.description}</p>
                    <p>
                      {service.price} {service.currency}
                    </p>
                  </>
                }
              />
            </Card>
          )
        })}
      </Flex>
      <AppButton icon={<PlusOutlined />} className='w-full' onClick={onEditServiceClick} data-provider-id={providerId}>
        Add service
      </AppButton>

      <Modal
        title='Confirm changes'
        open={editServiceModalOpened}
        onOk={onEditServiceApprove}
        onCancel={closeEditServiceModal}
        okText='Save'
        cancelText='Close'
        okButtonProps={{ loading: isPending, disabled: isPending }}
        centered
      >
        <Typography.Paragraph>Edit Provider Form</Typography.Paragraph>
      </Modal>
      <Modal
        title='Delete service'
        open={deleteServiceModalOpened}
        onOk={onDeleteServiceApprove}
        onCancel={closeDeleteServiceModal}
        okText='Yes'
        cancelText='No'
        okButtonProps={{ danger: true, loading: isPending, disabled: isPending }}
        centered
      >
        <Typography.Paragraph>Are you sure you want to delete this image?</Typography.Paragraph>
      </Modal>
    </Flex>
  )
}

export default ProviderProfileServices

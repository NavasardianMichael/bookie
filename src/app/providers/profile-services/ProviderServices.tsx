'use client'

import React, { useCallback, useRef, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Flex, Modal, Typography } from 'antd'
import { useForm } from 'antd/es/form/Form'
import { useFormik } from 'formik'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { ProviderServiceFormValues } from '@interfaces/services'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import { processProviderServiceFormToPostPayload } from '@components/providerServiceForm/processors'
import ProviderServiceForm from '@components/providerServiceForm/ProviderServiceForm'
import AppButton from '@components/ui/AppButton'
import AppSheet from '@components/ui/AppSheet'
import EmptyState from '@components/ui/EmptyState'

type Props = {
  initialValues?: ProviderServiceFormValues
}

const ProviderServices: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES }) => {
  const { id: providerId, services, putProviderService, deleteProviderService } = useProviderProfileStore()
  const { allIds, byId } = services
  const [form] = useForm<ProviderServiceFormValues>()

  const [editServiceModalOpened, setEditServiceModalOpened] = useState(false)
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

  const closeEditServiceModal = useCallback(() => {
    setEditServiceModalOpened(false)
  }, [])

  const formik = useFormik<ProviderServiceFormValues>({
    initialValues,
    validateOnChange: false,
    onSubmit: async (values) => {
      const payload = processProviderServiceFormToPostPayload(providerId, values)
      await putProviderService(payload)

      formik.resetForm()
      closeEditServiceModal()
    },
  })

  const onEditServiceClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      const { serviceId } = e.currentTarget.dataset
      const service = serviceId ? byId[serviceId] : undefined

      // "Add service" passes no serviceId. Editing loads the clicked service into
      // both stores — formik owns the values, antd owns validation — so the modal
      // is not a blank create form.
      const nextValues: ProviderServiceFormValues = service
        ? {
            id: service.id,
            name: service.name,
            duration: service.duration,
            description: service.description,
            price: service.price,
            currency: service.currency,
            image: service.image,
            categoryId: service.categoryId,
          }
        : initialValues

      formik.setValues(nextValues)
      form.setFieldsValue(nextValues)
      setEditServiceModalOpened(true)
    },
    [byId, form, formik, initialValues]
  )

  const addServiceButton = (
    <AppButton icon={<PlusOutlined />} className='w-full' onClick={onEditServiceClick} data-provider-id={providerId}>
      Add service
    </AppButton>
  )

  return (
    <Flex vertical justify='space-between' align='center' className='w-full' gap={16}>
      {allIds.length ? (
        <Flex vertical gap='middle' className='w-full'>
          {allIds.map((serviceId) => {
            const service = byId[serviceId]
            return (
              <Card
                key={service.id}
                className='w-full'
                actions={[
                  <Button
                    type='text'
                    icon={<EditOutlined />}
                    key='edit'
                    aria-label={`Edit ${service.name}`}
                    className='min-h-11 min-w-11'
                    onClick={onEditServiceClick}
                    data-provider-id={providerId}
                    data-service-id={serviceId}
                  />,
                  <Button
                    type='text'
                    icon={<DeleteOutlined />}
                    key='delete'
                    danger
                    aria-label={`Delete ${service.name}`}
                    className='min-h-11 min-w-11'
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
      ) : (
        <EmptyState
          className='w-full'
          title='No services yet'
          description='Add the services clients can book with you.'
          action={addServiceButton}
        />
      )}

      {!!allIds.length && addServiceButton}

      <AppSheet title='Service Configuration' open={editServiceModalOpened} onClose={closeEditServiceModal}>
        <ProviderServiceForm form={form} formik={formik} closeModal={closeEditServiceModal} />
      </AppSheet>

      <Modal
        title='Delete service'
        open={deleteServiceModalOpened}
        onOk={onDeleteServiceApprove}
        onCancel={closeDeleteServiceModal}
        okText='Yes'
        cancelText='No'
        okButtonProps={{
          danger: true,
          htmlType: 'submit',
          loading: formik.isSubmitting,
          disabled: formik.isSubmitting,
        }}
        centered
      >
        <Typography.Paragraph>Are you sure you want to delete this service?</Typography.Paragraph>
      </Modal>
    </Flex>
  )
}

export default ProviderServices

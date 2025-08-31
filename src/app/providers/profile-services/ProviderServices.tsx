'use client'

import React, { useCallback, useRef, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Flex, Modal, Typography } from 'antd'
import { useForm } from 'antd/es/form/Form'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { ProviderServiceFormValues } from '@interfaces/services'
import { ROUTES } from '@constants/routes'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import { processProviderServiceFormToPostPayload } from '@components/providerServiceForm/processors'
import ProviderServiceForm from '@components/providerServiceForm/ProviderServiceForm'
import AppButton from '@components/ui/AppButton'

import '@ant-design/v5-patch-for-react-19'

type Props = {
  initialValues?: ProviderServiceFormValues
}

const ProviderServices: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES }) => {
  const { push } = useRouter()
  const { id: providerId, services, putProviderService, deleteProviderService } = useProviderProfileStore()
  const { allIds, byId } = services
  const [form] = useForm<ProviderServiceFormValues>()

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

  const formik = useFormik<ProviderServiceFormValues>({
    initialValues,
    validateOnChange: false,
    onSubmit: async (values) => {
      console.log({ values })
      const payload = processProviderServiceFormToPostPayload(providerId, values)
      await putProviderService(payload)
      push(ROUTES.providerServices)
    },
  })

  const onEditServiceApprove: React.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    await formik.submitForm()
    form.validateFields()
  }, [form, formik])

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
        title='Service Configuration'
        open={editServiceModalOpened}
        onOk={onEditServiceApprove}
        onCancel={closeEditServiceModal}
        okText='Save'
        cancelText='Close'
        okButtonProps={{ className: 'hidden!' }}
        cancelButtonProps={{ className: 'hidden!' }}
        className='p-2! max-h-[97vh]! overflow-auto'
        wrapClassName='m-auto'
        centered
      >
        <ProviderServiceForm form={form} formik={formik} />
      </Modal>
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
        <Typography.Paragraph>Are you sure you want to delete this image?</Typography.Paragraph>
      </Modal>
    </Flex>
  )
}

export default ProviderServices

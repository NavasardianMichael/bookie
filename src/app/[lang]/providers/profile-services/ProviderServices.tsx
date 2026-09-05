'use client'

import React, { useCallback, useRef, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Flex, Modal, Typography } from 'antd'
import { useForm } from 'antd/es/form/Form'
import { useFormik } from 'formik'
import Image from 'next/image'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { ProviderServiceFormValues } from '@interfaces/services'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import { formatDuration, toIsoDuration } from '@helpers/duration'
import { resolveAssetUrl } from '@helpers/images'
import { processProviderServiceFormToPostPayload } from '@components/providerServiceForm/processors'
import { ProviderServiceForm } from '@components/providerServiceForm/ProviderServiceForm'
import { AppButton } from '@components/ui/AppButton'
import { AppSheet } from '@components/ui/AppSheet'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTime } from '@components/ui/bare/AppTime'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { EmptyState } from '@components/ui/EmptyState'
import { ScissorsIcon } from '@components/ui/icons'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'

type Props = {
  initialValues?: ProviderServiceFormValues
}

export const ProviderServices: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES }) => {
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
    <AppButton icon={<PlusOutlined />} onClick={onEditServiceClick} data-provider-id={providerId}>
      Add service
    </AppButton>
  )

  return (
    <Flex vertical gap={16} className='w-full'>
      {allIds.length ? (
        <>
          <Flex justify='end'>{addServiceButton}</Flex>

          <ResponsiveGrid as='ul'>
            {allIds.map((serviceId) => {
              const service = byId[serviceId]
              const resolvedImage = resolveAssetUrl(service.image)

              return (
                <li
                  key={service.id}
                  className='border-brand-border bg-surface flex flex-col gap-3 rounded-brand border p-4 sm:p-5'
                >
                  <div className='flex items-start gap-3'>
                    <div className='bg-brand-50 relative size-11 shrink-0 overflow-hidden rounded-brand-sm'>
                      {resolvedImage ? (
                        <Image src={resolvedImage} alt={service.name} fill sizes='44px' className='object-cover' />
                      ) : (
                        <span className='text-brand-400 flex h-full w-full items-center justify-center'>
                          <ScissorsIcon className='h-5 w-5' />
                        </span>
                      )}
                    </div>
                    <div className='flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5'>
                      <AppTitle level='h3' size='h3' className='line-clamp-1'>
                        {service.name}
                      </AppTitle>
                      <p className='m-0 flex flex-wrap items-center gap-x-2'>
                        <AppTime dateTime={toIsoDuration(service.duration)} className='text-body-sm'>
                          {formatDuration(service.duration)}
                        </AppTime>
                        {service.price !== undefined && service.currency && (
                          <>
                            <AppText aria-hidden='true'>·</AppText>
                            <AppText size='body-sm' tone='default' numeric className='font-semibold'>
                              {service.price} {service.currency}
                            </AppText>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {service.description && (
                    <AppParagraph size='body-sm' className='line-clamp-2'>
                      {service.description}
                    </AppParagraph>
                  )}

                  <Flex gap={4} justify='end' className='border-brand-border mt-auto border-t pt-2'>
                    <Button
                      type='text'
                      icon={<EditOutlined />}
                      aria-label={`Edit ${service.name}`}
                      className='min-h-11 min-w-11'
                      onClick={onEditServiceClick}
                      data-provider-id={providerId}
                      data-service-id={serviceId}
                    />
                    <Button
                      type='text'
                      icon={<DeleteOutlined />}
                      danger
                      aria-label={`Delete ${service.name}`}
                      className='min-h-11 min-w-11'
                      onClick={onDeleteServiceClick}
                      data-provider-id={providerId}
                      data-service-id={serviceId}
                    />
                  </Flex>
                </li>
              )
            })}
          </ResponsiveGrid>
        </>
      ) : (
        <EmptyState
          className='w-full'
          title='No services yet'
          description='Add the services clients can book with you.'
          action={addServiceButton}
        />
      )}

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

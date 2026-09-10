'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Alert, Tabs } from 'antd'
import { useTranslations } from 'next-intl'
import { listAppointmentsAPI } from '@api/appointments/main'
import { useCategoriesListStore } from '@store/categories/list/store'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { ProviderServiceFormValues } from '@interfaces/services'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import { processError } from '@helpers/error'
import { processProviderServiceFormToRequestPayload } from '@components/providerServiceForm/processors'
import { ProviderServiceForm } from '@components/providerServiceForm/ProviderServiceForm'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppSheet } from '@components/ui/AppSheet'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { CalendarIcon, ClockIcon, ListIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { StatTile } from '@components/ui/StatTile'
import { ProviderServiceCard } from './ProviderServiceCard'

type Props = {
  initialValues?: ProviderServiceFormValues
}

const FILTERS = { all: 'all', active: 'active', incomplete: 'incomplete' } as const

type Filter = (typeof FILTERS)[keyof typeof FILTERS]

/** A service with no price cannot be presented to a client as bookable. */
const isPriced = (price: number | undefined): boolean => typeof price === 'number' && price > 0

const CLOSED_STATUSES = ['cancelled', 'completed', 'no_show']

export const ProviderServices: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES }) => {
  const t = useTranslations('Services')
  const {
    id: providerId,
    services,
    getProviderProfileData,
    postProviderService,
    putProviderService,
    deleteProviderService,
  } = useProviderProfileStore()
  const getCategoriesList = useCategoriesListStore.use.getCategoriesList()
  const categories = useCategoriesListStore.use.list()
  const { allIds, byId } = services
  const [editValues, setEditValues] = useState<ProviderServiceFormValues>(initialValues)

  const [editServiceModalOpened, setEditServiceModalOpened] = useState(false)
  const [deleteServiceModalOpened, setDeleteServiceModalOpened] = useState(false)
  const deleteServiceIdRef = useRef<string | null>(null)

  const [filter, setFilter] = useState<Filter>(FILTERS.all)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /**
   * The store slice this page reads had no loader wired to it, so the list stayed
   * permanently empty and `providerId` stayed `''` — which posted every new
   * service to `/providers//services`. Nothing else on the account shell hydrates it.
   *
   * The category list is loaded here for the same reason: the service form's category
   * picker reads it and nothing else fills it, so `categoryId` — a required foreign
   * key — had no valid option to offer.
   */
  useEffect(() => {
    void Promise.all([getProviderProfileData(), getCategoriesList()])
      .catch((error) => setLoadError(processError(error).message))
      .finally(() => setIsLoading(false))
  }, [getCategoriesList, getProviderProfileData])

  // The bookings figure is the one stat the profile payload does not carry, and a
  // failure here must not take the services list down with it.
  useEffect(() => {
    void listAppointmentsAPI()
      .then((all) => {
        const now = Date.now()
        setUpcomingCount(
          all.filter((a) => new Date(a.time.startDate).getTime() >= now && !CLOSED_STATUSES.includes(a.status)).length
        )
      })
      .catch(() => setUpcomingCount(null))
  }, [])

  const serviceList = useMemo(() => allIds.map((serviceId) => byId[serviceId]).filter(Boolean), [allIds, byId])

  const visibleServices = useMemo(
    () =>
      serviceList.filter((service) => {
        if (filter === FILTERS.active) return isPriced(service.price)
        if (filter === FILTERS.incomplete) return !isPriced(service.price)
        return true
      }),
    [filter, serviceList]
  )

  const averageDuration = useMemo(() => {
    const durations = serviceList.map((service) => service.duration).filter((duration) => duration > 0)
    if (!durations.length) return null
    return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
  }, [serviceList])

  const closeDeleteServiceModal = useCallback(() => {
    setDeleteServiceModalOpened(false)
  }, [])

  const onDeleteService = useCallback((serviceId: string) => {
    deleteServiceIdRef.current = serviceId
    setDeleteServiceModalOpened(true)
  }, [])

  // Deliberately unguarded: AppConfirmModal awaits this, and a rejection keeps the
  // dialog open with the API's message rather than closing on a delete that failed.
  const onDeleteServiceApprove = useCallback(async () => {
    const serviceId = deleteServiceIdRef.current
    if (serviceId) await deleteProviderService({ providerId, serviceId })
    closeDeleteServiceModal()
  }, [closeDeleteServiceModal, deleteProviderService, providerId])

  const closeEditServiceModal = useCallback(() => {
    setEditServiceModalOpened(false)
  }, [])

  /**
   * `values.id` is the only thing separating a create from an edit — it is set only
   * for a service that already exists, and that is what picks the endpoint.
   */
  const onSubmitService = useCallback(
    async (values: ProviderServiceFormValues) => {
      const service = processProviderServiceFormToRequestPayload(values)

      setIsSubmitting(true)
      setFormError(null)
      try {
        if (values.id) {
          await putProviderService({ providerId, serviceId: values.id, service })
        } else {
          await postProviderService({ providerId, service })
        }
        closeEditServiceModal()
        // A typed-in category becomes a Category row; refresh so the next open lists it.
        void getCategoriesList()
      } catch (error) {
        setFormError(processError(error).message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [closeEditServiceModal, getCategoriesList, postProviderService, providerId, putProviderService]
  )

  const openServiceForm = useCallback(
    (serviceId?: string) => {
      const service = serviceId ? byId[serviceId] : undefined

      // "Add service" passes no serviceId. `initialValues` is what loads an edit —
      // never `setFieldsValue`: AppSheet destroys its Form while closed, so the
      // instance reached from here would be disconnected. The form is keyed on the
      // service id below, and that remount is what applies these values.
      setEditValues(
        service
          ? {
              id: service.id,
              name: service.name,
              duration: service.duration,
              description: service.description,
              price: service.price,
              currency: service.currency,
              image: service.image,
              category: {
                id: service.categoryId,
                name: categories.byId[service.categoryId]?.name ?? '',
              },
            }
          : initialValues
      )
      setFormError(null)
      setEditServiceModalOpened(true)
    },
    [byId, categories.byId, initialValues]
  )

  const onAddServiceClick = useCallback(() => openServiceForm(), [openServiceForm])

  const addServiceButton = (
    <AppButton type='primary' icon={<PlusOutlined />} onClick={onAddServiceClick}>
      {t('addNew')}
    </AppButton>
  )

  const tabItems = useMemo(() => {
    const priced = serviceList.filter((service) => isPriced(service.price)).length

    return [
      { key: FILTERS.all, label: t('tabAll', { count: serviceList.length }) },
      { key: FILTERS.active, label: t('tabActive', { count: priced }) },
      { key: FILTERS.incomplete, label: t('tabIncomplete', { count: serviceList.length - priced }) },
    ]
  }, [serviceList, t])

  return (
    <div className='flex w-full flex-col gap-8'>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={addServiceButton}
      />

      {loadError && <Alert type='error' showIcon message={loadError} />}

      <ResponsiveGrid min='sm' gap='md'>
        <StatTile
          layout='row'
          icon={<ListIcon className='h-5 w-5' />}
          label={t('statTotal')}
          value={isLoading ? '—' : serviceList.length}
        />
        <StatTile
          layout='row'
          icon={<CalendarIcon className='h-5 w-5' />}
          label={t('statUpcoming')}
          value={upcomingCount ?? '—'}
        />
        <StatTile
          layout='row'
          icon={<ClockIcon className='h-5 w-5' />}
          label={t('statDuration')}
          value={averageDuration ? t('durationValue', { minutes: averageDuration }) : '—'}
        />
      </ResponsiveGrid>

      {isLoading ? (
        <ResponsiveGrid>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className='bg-surface-sunken min-h-56 animate-pulse rounded-brand' />
          ))}
        </ResponsiveGrid>
      ) : serviceList.length ? (
        <div className='flex flex-col gap-2'>
          <Tabs activeKey={filter} onChange={(key) => setFilter(key as Filter)} items={tabItems} />

          {visibleServices.length ? (
            <ResponsiveGrid as='ul' className='m-0 list-none p-0'>
              {visibleServices.map((service) => (
                <ProviderServiceCard
                  key={service.id}
                  service={service}
                  isPriced={isPriced(service.price)}
                  onEdit={openServiceForm}
                  onDelete={onDeleteService}
                />
              ))}

              <li className='min-w-0'>
                <button
                  type='button'
                  onClick={onAddServiceClick}
                  className='border-brand-border text-brand-muted hover:bg-brand-50 hover:border-brand hover:text-brand focus-visible:ring-brand/40 flex h-full min-h-56 w-full flex-col items-center justify-center gap-4 rounded-brand border-2 border-dashed p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
                >
                  <span
                    aria-hidden
                    className='border-brand-border bg-surface flex size-12 items-center justify-center rounded-full border'
                  >
                    <PlusOutlined />
                  </span>
                  <AppText size='body-sm' className='font-bold'>
                    {t('addAnother')}
                  </AppText>
                </button>
              </li>
            </ResponsiveGrid>
          ) : (
            <EmptyState
              className='w-full'
              title={filter === FILTERS.active ? t('emptyPricedTitle') : t('emptyIncompleteTitle')}
              description={filter === FILTERS.active ? t('emptyPricedBody') : t('emptyIncompleteBody')}
            />
          )}
        </div>
      ) : (
        <EmptyState
          className='w-full'
          title={t('emptyTitle')}
          description={t('emptyBody')}
          action={addServiceButton}
        />
      )}

      <AppSheet title={t('sheetTitle')} open={editServiceModalOpened} onClose={closeEditServiceModal}>
        {editServiceModalOpened ? (
          <>
            {formError && <Alert type='error' showIcon message={formError} />}
            <ProviderServiceForm
              key={editValues.id ?? 'new'}
              initialValues={editValues}
              isSubmitting={isSubmitting}
              onSubmit={onSubmitService}
              closeModal={closeEditServiceModal}
            />
          </>
        ) : null}
      </AppSheet>

      <AppConfirmModal
        tone='danger'
        title={t('deleteTitle')}
        description={t('deleteBody')}
        okText={t('delete')}
        open={deleteServiceModalOpened}
        onConfirm={onDeleteServiceApprove}
        onCancel={closeDeleteServiceModal}
      />
    </div>
  )
}

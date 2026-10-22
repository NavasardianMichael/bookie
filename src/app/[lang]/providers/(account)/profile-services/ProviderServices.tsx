'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Spin, Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { listAppointmentsAPI } from '@api/appointments/main'
import { useProviderProfileStore } from '@store/providers/profile/store'
import { ProviderServiceFormValues } from '@interfaces/services'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES } from '@constants/services'
import { hasRoomFor } from '@helpers/plans'
import { reportError } from '@helpers/reportError'
import { openWeekdays } from '@helpers/serviceAvailability'
import { resolveTimeFormat } from '@helpers/timeFormat'
import { calendarDayOf } from '@helpers/timeZone'
import {
  processProviderServiceFormToRequestPayload,
  toServiceAvailabilityFormValues,
} from '@components/providerServiceForm/processors'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppSheet } from '@components/ui/AppSheet'
import { AppText } from '@components/ui/bare/AppText'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { CalendarIcon, ListIcon } from '@components/ui/icons'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { StatTile } from '@components/ui/StatTile'
import { ProviderServiceCard } from './ProviderServiceCard'

/** The service form (and its cropper) load when Add or Edit opens the sheet. */
const ProviderServiceForm = dynamic(
  () => import('@components/providerServiceForm/ProviderServiceForm').then((mod) => mod.ProviderServiceForm),
  {
    loading: () => (
      <div className='flex justify-center py-10'>
        <Spin />
      </div>
    ),
  }
)

type Props = {
  initialValues?: ProviderServiceFormValues
}

const FILTERS = { all: 'all', active: 'active', inactive: 'inactive' } as const

type Filter = (typeof FILTERS)[keyof typeof FILTERS]

const CLOSED_STATUSES = ['cancelled', 'completed', 'no_show']

export const ProviderServices: React.FC<Props> = ({ initialValues = PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES }) => {
  const t = useTranslations('Services')
  const tErrors = useTranslations('Errors')
  const locale = useLocale()
  const {
    id: providerId,
    services,
    details,
    personal,
    getProviderProfileData,
    postProviderService,
    putProviderService,
    deleteProviderService,
  } = useProviderProfileStore()
  const { allIds, byId } = services
  const [editValues, setEditValues] = useState<ProviderServiceFormValues>(initialValues)

  const [editServiceModalOpened, setEditServiceModalOpened] = useState(false)
  const [deleteServiceModalOpened, setDeleteServiceModalOpened] = useState(false)
  const deleteServiceIdRef = useRef<string | null>(null)
  /** The service whose active flag the confirm dialog is about to flip. */
  const [toggleServiceId, setToggleServiceId] = useState<string | null>(null)
  /** The service the confirm dialog is about to copy into a new row. */
  const [duplicateServiceId, setDuplicateServiceId] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>(FILTERS.all)
  const [loadError, setLoadError] = useState<unknown>(null)
  /** Bumped by Retry to run the load again. */
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<unknown>(null)

  /**
   * The store slice this page reads had no loader wired to it, so the list stayed
   * permanently empty and `providerId` stayed `''` — which posted every new
   * service to `/providers//services`. Nothing else on the account shell hydrates it.
   */
  useEffect(() => {
    void getProviderProfileData()
      .catch((error: unknown) => setLoadError(error))
      .finally(() => setIsLoading(false))
  }, [getProviderProfileData, loadAttempt])

  const retryLoad = useCallback(() => {
    setLoadError(null)
    setIsLoading(true)
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  // The bookings figure is the one stat the profile payload does not carry, and a
  // failure here must not take the services list down with it. The tile shows `—`, which
  // is honest; the failure is recorded rather than announced over a working page.
  useEffect(() => {
    void listAppointmentsAPI()
      .then((all) => {
        const now = Date.now()
        setUpcomingCount(
          all.filter((a) => new Date(a.time.startDate).getTime() >= now && !CLOSED_STATUSES.includes(a.status)).length
        )
      })
      .catch((error: unknown) => {
        reportError(error, 'ProviderServices:upcomingCount')
        setUpcomingCount(null)
      })
  }, [])

  const serviceList = useMemo(() => allIds.map((serviceId) => byId[serviceId]).filter(Boolean), [allIds, byId])
  const activeCount = useMemo(() => serviceList.filter((service) => service.active).length, [serviceList])

  /**
   * The plan's cap on active services. `undefined` until the profile has loaded, which is
   * read as "no cap yet" rather than as a lock — the API refuses an over-cap write either
   * way, and locking controls before we know would flash them disabled for everyone.
   */
  const serviceLimit = personal.entitlements ? personal.entitlements.maxActiveServices : null
  const bookingLimit = personal.entitlements ? personal.entitlements.maxBookingsPerMonth : null
  const atServiceLimit = !hasRoomFor(activeCount, serviceLimit)

  /** `5/30` when the plan caps it; the bare count when the plan does not. */
  const ofLimit = (used: number, limit: number | null): string => (limit === null ? String(used) : `${used}/${limit}`)

  const visibleServices = useMemo(
    () =>
      serviceList.filter((service) => {
        if (filter === FILTERS.active) return service.active
        if (filter === FILTERS.inactive) return !service.active
        return true
      }),
    [filter, serviceList]
  )

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
      } catch (error) {
        setFormError(error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [closeEditServiceModal, postProviderService, providerId, putProviderService]
  )

  const openServiceForm = useCallback(
    (serviceId?: string) => {
      const service = serviceId ? byId[serviceId] : undefined

      // "Add service" passes no serviceId. `initialValues` is what loads an edit —
      // never `setFieldsValue`: AppSheet destroys its Form while closed, so the
      // instance reached from here would be disconnected. The form is keyed on the
      // service id below, and that remount is what applies these values.
      const availability = toServiceAvailabilityFormValues(
        service?.availability,
        openWeekdays(details.weekSchedule),
        calendarDayOf(new Date(), details.timeZone).format(DAY_KEY_FORMAT)
      )
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
              availability,
            }
          : { ...initialValues, availability }
      )
      setFormError(null)
      setEditServiceModalOpened(true)
    },
    [byId, details.timeZone, details.weekSchedule, initialValues]
  )

  const toggleService = toggleServiceId ? byId[toggleServiceId] : undefined
  const nextActive = toggleService ? !toggleService.active : false

  const onToggleActive = useCallback((serviceId: string) => {
    setToggleServiceId(serviceId)
  }, [])

  const closeToggleModal = useCallback(() => {
    setToggleServiceId(null)
  }, [])

  // Deliberately unguarded, same as delete: AppConfirmModal awaits this, and a
  // rejection keeps the dialog open rather than closing on a toggle that failed.
  const onToggleApprove = useCallback(async () => {
    if (!toggleServiceId || !toggleService) return
    await putProviderService({
      providerId,
      serviceId: toggleServiceId,
      service: { active: !toggleService.active },
    })
    closeToggleModal()
  }, [closeToggleModal, providerId, putProviderService, toggleService, toggleServiceId])

  const duplicateSource = duplicateServiceId ? byId[duplicateServiceId] : undefined

  const onDuplicateService = useCallback((serviceId: string) => {
    setDuplicateServiceId(serviceId)
  }, [])

  const closeDuplicateModal = useCallback(() => {
    setDuplicateServiceId(null)
  }, [])

  // Deliberately unguarded, same as delete: AppConfirmModal awaits this, and a
  // rejection — the plan cap, most often — keeps the dialog open.
  const onDuplicateApprove = useCallback(async () => {
    if (!duplicateSource) {
      closeDuplicateModal()
      return
    }
    await postProviderService({
      providerId,
      service: {
        name: duplicateSource.name,
        duration: duplicateSource.duration,
        ...(duplicateSource.description ? { description: duplicateSource.description } : {}),
        ...(duplicateSource.price !== undefined ? { price: duplicateSource.price } : {}),
        ...(duplicateSource.currency ? { currency: duplicateSource.currency } : {}),
        ...(duplicateSource.image ? { imageUrl: duplicateSource.image } : {}),
        active: duplicateSource.active,
        availability: duplicateSource.availability,
      },
    })
    closeDuplicateModal()
  }, [closeDuplicateModal, duplicateSource, postProviderService, providerId])

  const onAddServiceClick = useCallback(() => openServiceForm(), [openServiceForm])

  // A new service is created active, so at the cap there is nothing Add could save.
  const addServiceButton = (
    <AppButton type='primary' icon={<PlusOutlined />} onClick={onAddServiceClick} disabled={atServiceLimit}>
      {t('addNew')}
    </AppButton>
  )

  const tabItems = useMemo(
    () => [
      { key: FILTERS.all, label: t('tabAll', { count: serviceList.length }) },
      { key: FILTERS.active, label: t('tabActive', { count: activeCount }) },
      { key: FILTERS.inactive, label: t('tabInactive', { count: serviceList.length - activeCount }) },
    ],
    [activeCount, serviceList.length, t]
  )

  return (
    <div className='flex w-full flex-col gap-8'>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={addServiceButton}
      />

      <ResponsiveGrid min='sm' gap='md'>
        <StatTile
          layout='row'
          icon={<ListIcon className='h-5 w-5' />}
          label={t('statTotal')}
          value={isLoading ? '—' : serviceLimit === null ? serviceList.length : ofLimit(activeCount, serviceLimit)}
        />
        <StatTile
          layout='row'
          icon={<CalendarIcon className='h-5 w-5' />}
          label={t('statUpcoming')}
          value={upcomingCount === null ? '—' : ofLimit(upcomingCount, bookingLimit)}
        />
      </ResponsiveGrid>

      {/* A failed load replaces the list: an empty list beside the error would say the
          provider has no services, which is exactly what we could not find out. */}
      {loadError !== null ? (
        <ErrorAlert error={loadError} onRetry={retryLoad} />
      ) : isLoading ? (
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
                  onEdit={openServiceForm}
                  onDuplicate={onDuplicateService}
                  onDelete={onDeleteService}
                  onToggleActive={onToggleActive}
                  activationLocked={atServiceLimit}
                />
              ))}

              {!atServiceLimit && (
              <li className='min-w-0'>
                <button
                  type='button'
                  onClick={onAddServiceClick}
                  className='border-brand-border text-brand-muted hover:bg-brand-50 hover:border-brand hover:text-brand focus-visible:ring-brand/40 flex h-full min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-brand border-2 border-dashed p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]'
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
              )}
            </ResponsiveGrid>
          ) : (
            <EmptyState
              className='w-full'
              title={filter === FILTERS.active ? t('emptyActiveTitle') : t('emptyInactiveTitle')}
              description={filter === FILTERS.active ? t('emptyActiveBody') : t('emptyInactiveBody')}
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

      <AppSheet
        title={t('sheetTitle')}
        open={editServiceModalOpened}
        onClose={closeEditServiceModal}
        pending={isSubmitting}
      >
        {editServiceModalOpened ? (
          <>
            {formError !== null && <ErrorAlert error={formError} />}
            <ProviderServiceForm
              key={editValues.id ?? 'new'}
              initialValues={editValues}
              isSubmitting={isSubmitting}
              onSubmit={onSubmitService}
              closeModal={closeEditServiceModal}
              weekSchedule={details.weekSchedule}
              timeZone={details.timeZone}
              timeFormat={resolveTimeFormat(details.timeFormat, locale)}
            />
          </>
        ) : null}
      </AppSheet>

      <AppConfirmModal
        tone={nextActive ? 'default' : 'warning'}
        title={nextActive ? t('activateTitle') : t('deactivateTitle')}
        description={nextActive ? t('activateBody') : t('deactivateBody')}
        okText={nextActive ? t('activateService') : t('deactivateService')}
        open={toggleServiceId !== null}
        onConfirm={onToggleApprove}
        onCancel={closeToggleModal}
      />

      <AppConfirmModal
        title={t('duplicateTitle')}
        description={t('duplicateBody')}
        okText={t('duplicate')}
        open={duplicateServiceId !== null}
        onConfirm={onDuplicateApprove}
        onCancel={closeDuplicateModal}
      />

      <AppConfirmModal
        tone='danger'
        title={t('deleteTitle')}
        description={t('deleteBody')}
        okText={t('delete')}
        open={deleteServiceModalOpened}
        onConfirm={onDeleteServiceApprove}
        errorOverrides={{ 409: tErrors('conflicts.serviceHasAppointments') }}
        onCancel={closeDeleteServiceModal}
      />
    </div>
  )
}

'use client'

import { FC, useCallback, useMemo, useState } from 'react'
import { BookingMonth } from '@app/[lang]/providers/[providerId]/components/BookingMonth'
import { BookingShareActions } from '@app/[lang]/providers/[providerId]/components/BookingShareActions'
import { BookingSlots } from '@app/[lang]/providers/[providerId]/components/BookingSlots'
import { BookingSummary, BookingSummaryData } from '@app/[lang]/providers/[providerId]/components/BookingSummary'
import { ServicePicker } from '@app/[lang]/providers/[providerId]/components/ServicePicker'
import { App, Tag } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useLocale, useTranslations } from 'next-intl'
import { patchManagedAppointmentAPI } from '@api/appointments/main'
import { BookingStatus, ManagedAppointmentPayload } from '@api/appointments/types'
import { Locale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTE_KEYS } from '@constants/routes'
import { DAY_KEY_FORMAT, SCHEDULE_DISPLAY_FORMAT } from '@constants/schedule'
import { countSlotsByDay, getSlotsForDate, getSlotsForDateRange } from '@helpers/booking'
import { generateEntityPath } from '@helpers/entities'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { absoluteUrl } from '@helpers/url'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { Surface } from '@components/ui/layout/Surface'

dayjs.extend(customParseFormat)

const DEFAULT_DURATION_MINUTES = 30

const STATUS_TONE: Record<BookingStatus, string> = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'default',
  cancelled: 'red',
  no_show: 'orange',
}

const isEditable = (status: BookingStatus): boolean => status === 'scheduled' || status === 'confirmed'

type Props = {
  token: string
  initial: ManagedAppointmentPayload
}

export const BookingManageClient: FC<Props> = ({ token, initial }) => {
  const t = useTranslations('Booking')
  const tStatus = useTranslations('Settings.bookings.status')
  const locale = useLocale() as Locale
  const { notification } = App.useApp()

  const [payload, setPayload] = useState(initial)
  const [isEditing, setIsEditing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const { appointment, provider } = payload
  const { basic, details, services } = provider
  const canEdit = isEditable(appointment.status)

  const serviceList = useMemo(
    () => services.allIds.map((id) => services.byId[id]).filter(Boolean),
    [services]
  )

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(appointment.service.id)
  const [month, setMonth] = useState<Dayjs>(() => dayjs(appointment.time.startDate).startOf('month'))
  const [pickedDayKey, setPickedDayKey] = useState<string | null>(() =>
    dayjs(appointment.time.startDate).format(DAY_KEY_FORMAT)
  )
  const [selectedStart, setSelectedStart] = useState<string | null>(appointment.time.startDate)

  const service = selectedServiceId ? services.byId[selectedServiceId] : undefined
  const durationMinutes = service?.duration || DEFAULT_DURATION_MINUTES

  const monthSlots = useMemo(
    () =>
      getSlotsForDateRange({
        weekSchedule: details?.weekSchedule,
        start: month.startOf('month').toDate(),
        end: month.endOf('month').add(1, 'day').startOf('day').toDate(),
        durationMinutes,
      }),
    [details?.weekSchedule, durationMinutes, month]
  )

  const slotCountByDay = useMemo(() => countSlotsByDay(monthSlots), [monthSlots])

  const firstOpenDayKey = useMemo(() => {
    for (const [key, count] of slotCountByDay) if (count > 0) return key
    return null
  }, [slotCountByDay])

  const selectedDayKey = useMemo(() => {
    if (pickedDayKey && (slotCountByDay.get(pickedDayKey) ?? 0) > 0) return pickedDayKey
    return firstOpenDayKey
  }, [firstOpenDayKey, pickedDayKey, slotCountByDay])

  const selectedDate = useMemo(
    () => (selectedDayKey ? dayjs(selectedDayKey, DAY_KEY_FORMAT).startOf('day').toDate() : null),
    [selectedDayKey]
  )

  const daySlots = useMemo(
    () =>
      selectedDate ? getSlotsForDate({ weekSchedule: details?.weekSchedule, date: selectedDate, durationMinutes }) : [],
    [details?.weekSchedule, durationMinutes, selectedDate]
  )

  const validSelectedStart = useMemo(
    () => (daySlots.some((slot) => slot.start.toISOString() === selectedStart) ? selectedStart : null),
    [daySlots, selectedStart]
  )

  const servicePrice =
    service?.price !== undefined && service?.currency ? `${service.price} ${service.currency}` : undefined
  const phone = details?.phone?.number
    ? generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' })
    : undefined

  const summary = useMemo<BookingSummaryData>(() => {
    const bookedPrice =
      appointment.price !== undefined && appointment.currency
        ? `${appointment.price} ${appointment.currency}`
        : undefined
    return {
      providerName: `${basic.firstName} ${basic.lastName}`,
      serviceName: appointment.service.name,
      serviceDescription: appointment.service.description,
      startISO: appointment.time.startDate,
      durationMinutes: appointment.time.duration,
      price: bookedPrice,
      address: details?.location?.address,
      phone,
      paymentMethods: appointment.paymentMethods ?? [],
    }
  }, [
    appointment.currency,
    appointment.paymentMethods,
    appointment.price,
    appointment.service.description,
    appointment.service.name,
    appointment.time.duration,
    appointment.time.startDate,
    basic.firstName,
    basic.lastName,
    details?.location?.address,
    phone,
  ])

  const handleSelectDay = useCallback((dayKey: string) => {
    setPickedDayKey(dayKey)
    setSelectedStart(null)
  }, [])

  const openEdit = useCallback(() => {
    setSelectedServiceId(appointment.service.id)
    setMonth(dayjs(appointment.time.startDate).startOf('month'))
    setPickedDayKey(dayjs(appointment.time.startDate).format(DAY_KEY_FORMAT))
    setSelectedStart(appointment.time.startDate)
    setIsEditing(true)
  }, [appointment.service.id, appointment.time.startDate])

  const rescheduleWhen = useMemo(() => {
    if (!validSelectedStart) return ''
    return [
      dayjs(validSelectedStart).format('dddd, D MMMM'),
      dayjs(validSelectedStart).format(SCHEDULE_DISPLAY_FORMAT),
      service?.name,
    ]
      .filter(Boolean)
      .join(' • ')
  }, [service?.name, validSelectedStart])

  const handleReschedule = useCallback(async () => {
    if (!validSelectedStart || !selectedServiceId) return
    const next = await patchManagedAppointmentAPI({
      token,
      serviceId: selectedServiceId,
      startAt: validSelectedStart,
      locale,
    })
    setPayload(next)
    setIsEditing(false)
    setRescheduleOpen(false)
    notification.success({ message: t('rescheduled') })
  }, [locale, notification, selectedServiceId, t, token, validSelectedStart])

  const handleCancel = useCallback(async () => {
    const next = await patchManagedAppointmentAPI({ token, status: 'cancelled' })
    setPayload(next)
    setCancelOpen(false)
    setIsEditing(false)
  }, [token])

  const providerName = `${basic.firstName} ${basic.lastName}`

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        {isEditing ? (
          // A button, not an AppLink: this stays on the same URL and only leaves the calendar.
          <AppButton type='link' onClick={() => setIsEditing(false)} className='self-start min-h-11 px-0'>
            {t('stopEditing')}
          </AppButton>
        ) : null}
        <PageHeader title={t('manageMetaTitle')} subtitle={t('manageSubtitle')} />
      </div>

      <Surface className='flex flex-col gap-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <AppTitle level='h2' size='h3'>
              {providerName}
            </AppTitle>
            <Tag color={STATUS_TONE[appointment.status]}>{tStatus(appointment.status)}</Tag>
          </div>
        </div>

        {appointment.status === 'cancelled' ? (
          <AppParagraph size='body-sm' className='m-0'>
            {t('cancelledNotice')}
          </AppParagraph>
        ) : null}

        <BookingSummary {...summary} />

        <BookingShareActions
          manageUrl={absoluteUrl(localePath(locale, generateEntityPath(ROUTE_KEYS.bookingManage, token)))}
          booking={summary}
        />

        {canEdit && !isEditing ? (
          <div className='flex flex-wrap gap-3'>
            <AppButton type='primary' onClick={openEdit}>
              {t('edit')}
            </AppButton>
            <AppButton danger onClick={() => setCancelOpen(true)}>
              {t('cancel')}
            </AppButton>
          </div>
        ) : null}

        {!canEdit && appointment.status !== 'cancelled' ? (
          <AppParagraph size='body-sm' className='m-0'>
            {t('cannotEdit')}
          </AppParagraph>
        ) : null}
      </Surface>

      {isEditing && canEdit ? (
        <>
          {!!serviceList.length && (
            <Surface>
              <div className='mb-5'>
                <AppTitle level='h3' size='h3'>
                  {t('chooseService')}
                </AppTitle>
                <AppParagraph size='body-sm' className='m-0'>
                  {t('chooseServiceHint')}
                </AppParagraph>
              </div>
              <ServicePicker services={serviceList} value={selectedServiceId} onChange={setSelectedServiceId} />
            </Surface>
          )}

          <BookingMonth
            month={month}
            selectedDayKey={selectedDayKey}
            slotCountByDay={slotCountByDay}
            weekSchedule={details?.weekSchedule}
            serviceName={service?.name}
            onSelectDay={handleSelectDay}
            onMonthChange={setMonth}
          />

          <BookingSlots
            date={selectedDate}
            slots={daySlots}
            selectedStart={validSelectedStart}
            requestedStarts={[]}
            serviceName={service?.name}
            servicePrice={servicePrice}
            isBooking={false}
            confirmLabel={t('confirmNewTime')}
            onSelect={setSelectedStart}
            onConfirm={() => setRescheduleOpen(true)}
          />
        </>
      ) : null}

      <AppConfirmModal
        open={rescheduleOpen}
        title={t('rescheduleConfirmTitle')}
        description={t('rescheduleConfirmBody', { when: rescheduleWhen })}
        okText={t('confirmNewTime')}
        onConfirm={handleReschedule}
        onCancel={() => setRescheduleOpen(false)}
      />

      <AppConfirmModal
        open={cancelOpen}
        title={t('cancelConfirmTitle')}
        description={t('cancelConfirmBody')}
        tone='danger'
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  )
}

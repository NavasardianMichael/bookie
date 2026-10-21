'use client'

import { FC, useMemo, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Form } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useLocale, useTranslations } from 'next-intl'
import { createImportedBookingsAPI } from '@api/bookingImport/main'
import { BookingDraft, ImportedBookingRequest } from '@api/bookingImport/types'
import { ProviderProfile } from '@store/providers/profile/types'
import { useProviderBusy } from '@hooks/useProviderBusy'
import { useFormUnsavedGuard } from '@hooks/useUnsavedChangesGuard'
import { IMPORT_MAX_ROWS } from '@constants/bookingImport'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { isOpenOnDate, isSlotTakenError } from '@helpers/booking'
import { checkDraftSlot, draftMonths, DraftSchedule, DraftSlotRow, draftStart, draftTimeOptions } from '@helpers/bookingImport'
import { processError, UserFacingError } from '@helpers/error'
import { toGuestPhoneNumber } from '@helpers/phone'
import { getTimeDisplayFormat, resolveTimeFormat } from '@helpers/timeFormat'
import { calendarDayOf } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { DraftFormRow, PhotoImportRow } from './PhotoImportRow'
import { PlanLimitAction } from './PlanLimitAction'

dayjs.extend(customParseFormat)

type FormValues = { drafts: DraftFormRow[] }

type Props = {
  drafts: BookingDraft[]
  /** The provider's own profile: hours, zone, clock and catalogue. */
  profile: ProviderProfile
  onBack: () => void
  onPendingChange: (pending: boolean) => void
  onImported: (count: number) => void
}

const toFormRow = (draft: BookingDraft, soleServiceId: string | undefined): DraftFormRow => ({
  fullName: draft.fullName ?? undefined,
  phone: draft.phone ?? undefined,
  // A provider with one service needs no read of which: every booking is for it.
  serviceId: draft.serviceId ?? soleServiceId,
  date: draft.date ? dayjs(draft.date, DAY_KEY_FORMAT, true) : undefined,
  time: draft.time ?? undefined,
  notes: draft.notes ?? undefined,
})

const toSlotRow = (row: DraftFormRow | undefined): DraftSlotRow => ({
  serviceId: row?.serviceId ?? null,
  date: row?.date?.isValid() ? row.date.format(DAY_KEY_FORMAT) : null,
  time: row?.time ?? null,
})

/**
 * Step two: every booking read off the photo, editable in place, checked against the
 * provider's real calendar as it is edited.
 *
 * The slot rules are `@helpers/bookingImport`'s — the public grid's engine — run over the
 * live form values on every render, so a row's warning appears and clears as the provider
 * types rather than on submit. Submit stays disabled while any row is flagged or the calendar
 * is still loading: the sheet only ever sends a batch it has checked. The API checks again,
 * and if a time went in the meantime (a `409`), the calendar is re-read and the rows that lost
 * their slot flag themselves.
 */
export const PhotoImportReviewForm: FC<Props> = ({ drafts, profile, onBack, onPendingChange, onImported }) => {
  const t = useTranslations('Bookings.import')
  const locale = useLocale()
  const [form] = Form.useForm<FormValues>()
  const unsaved = useFormUnsavedGuard()
  // Fixed for the sheet's life: a slot that passes while the provider is still editing is
  // caught by the API's own `startAt > now`.
  const [now] = useState(() => new Date())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const { weekSchedule, timeZone, timeFormat } = profile.details
  const activeServices = useMemo(
    () => profile.services.allIds.map((id) => profile.services.byId[id]).filter((service) => service?.active),
    [profile.services]
  )
  const soleServiceId = activeServices.length === 1 ? activeServices[0]?.id : undefined
  const serviceOptions = useMemo(
    () => activeServices.map((service) => ({ value: service.id, label: service.name })),
    [activeServices]
  )
  const schedule: DraftSchedule = useMemo(
    () => ({
      weekSchedule,
      timeZone,
      durations: Object.fromEntries(activeServices.map((service) => [service.id, service.duration])),
    }),
    [activeServices, timeZone, weekSchedule]
  )

  // Read once: the form owns the rows from here on.
  const [initialValues] = useState<FormValues>(() => ({
    drafts: drafts.map((draft) => toFormRow(draft, soleServiceId)),
  }))
  const watched = Form.useWatch('drafts', form) as DraftFormRow[] | undefined
  const rows = watched ?? initialValues.drafts
  const slotRows = useMemo(() => rows.map(toSlotRow), [rows])
  const months = useMemo(() => draftMonths(slotRows), [slotRows])
  const { busy, loading: busyLoading, error: busyError, retry, refresh } = useProviderBusy(profile.id, months)

  const checks = useMemo(
    () => slotRows.map((_, index) => checkDraftSlot({ rows: slotRows, index, schedule, busy, now })),
    [busy, now, schedule, slotRows]
  )
  const flagged = checks.filter(Boolean).length

  const timeDisplayFormat = getTimeDisplayFormat(resolveTimeFormat(timeFormat, locale))
  const today = calendarDayOf(now, timeZone)
  const isDateDisabled = (date: Dayjs): boolean => date.isBefore(today, 'day') || !isOpenOnDate(weekSchedule, date)

  const toRequest = (row: DraftFormRow): ImportedBookingRequest | null => {
    const start = draftStart(toSlotRow(row), timeZone)
    if (!row.serviceId || !start || !row.fullName?.trim() || !row.phone) return null
    return {
      serviceId: row.serviceId,
      startAt: start.toISOString(),
      fullName: row.fullName.trim(),
      phone: toGuestPhoneNumber(row.phone),
      notes: row.notes?.trim() || undefined,
    }
  }

  const handleFinish = async (values: FormValues) => {
    const bookings = values.drafts.map(toRequest)
    if (flagged || busyLoading || !bookings.length || bookings.some((booking) => booking === null)) return

    setSubmitting(true)
    onPendingChange(true)
    setSubmitError(null)
    try {
      onImported(await createImportedBookingsAPI({ bookings: bookings as ImportedBookingRequest[], locale }))
    } catch (error) {
      if (isSlotTakenError(processError(error))) {
        refresh()
        setSubmitError(new UserFacingError(t('slotsTaken'), { cause: error }))
      } else {
        setSubmitError(error)
      }
    } finally {
      setSubmitting(false)
      onPendingChange(false)
    }
  }

  return (
    <Form
      form={form}
      layout='vertical'
      requiredMark={false}
      initialValues={initialValues}
      onFinish={handleFinish}
      onValuesChange={unsaved.mark}
      disabled={submitting}
      scrollToFirstError
      className='flex w-full flex-col gap-6'
    >
      <AppParagraph size='body-sm' className='m-0'>
        {t('reviewIntro')}
      </AppParagraph>

      {busyError !== null && <ErrorAlert tone='warning' error={busyError} onRetry={retry} />}

      <Form.List name='drafts'>
        {(fields, { add, remove }) => (
          <>
            <ol className='m-0 flex list-none flex-col gap-4 p-0'>
              {fields.map((field, index) => (
                <PhotoImportRow
                  key={field.key}
                  field={field}
                  index={index}
                  check={checks[index] ?? null}
                  timeOptions={draftTimeOptions({ rows: slotRows, index, schedule, busy, now })}
                  currentTime={rows[index]?.time}
                  serviceOptions={serviceOptions}
                  isDateDisabled={isDateDisabled}
                  timeDisplayFormat={timeDisplayFormat}
                  onRemove={() => remove(field.name)}
                  disabled={submitting}
                />
              ))}
            </ol>
            <AppButton
              type='dashed'
              icon={<PlusOutlined />}
              onClick={() => add({ serviceId: soleServiceId } satisfies DraftFormRow)}
              disabled={submitting || fields.length >= IMPORT_MAX_ROWS}
            >
              {t('addRow')}
            </AppButton>
          </>
        )}
      </Form.List>

      {submitError !== null && <ErrorAlert error={submitError} action={<PlanLimitAction error={submitError} />} />}

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <AppText size='body-sm' tone={flagged ? 'danger' : 'muted'} aria-live='polite'>
          {flagged ? t('needsAttention', { count: flagged }) : null}
        </AppText>
        <div className='flex gap-2'>
          <AppButton onClick={onBack} disabled={submitting}>
            {t('back')}
          </AppButton>
          <AppButton
            type='primary'
            htmlType='submit'
            loading={submitting}
            disabled={!rows.length || flagged > 0 || busyLoading}
          >
            {t('submit', { count: rows.length })}
          </AppButton>
        </div>
      </div>
    </Form>
  )
}

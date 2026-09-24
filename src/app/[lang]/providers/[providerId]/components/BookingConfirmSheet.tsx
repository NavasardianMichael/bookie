'use client'

import { FC, useState } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { Alert, Form, Spin, Tooltip } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { GuestBookingDetails } from '@api/appointments/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { PaymentInfo, PaymentMethod } from '@interfaces/settings'
import { Locale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { MAX_CHARS_FOR_INPUT, MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { ROUTE_KEYS } from '@constants/routes'
import { PAYMENT_METHODS } from '@constants/settings'
import { generateEntityPath } from '@helpers/entities'
import { toPaymentShare } from '@helpers/payment'
import { toGuestPhoneNumber } from '@helpers/phone'
import { absoluteUrl } from '@helpers/url'
import { BankTransferDetails } from '@components/settings/BankTransferDetails'
import { PaymentMethodPicker } from '@components/settings/PaymentMethodPicker'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppSheet } from '@components/ui/AppSheet'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon, InfoIcon } from '@components/ui/icons'
import { BookingShareActions } from './BookingShareActions'
import { BookingSummary, BookingSummaryData } from './BookingSummary'

/** What the visitor filled in. `guest` is absent whenever we already know who they are. */
export type BookingConfirmSubmission = {
  notes?: string
  paymentMethods?: PaymentMethod[]
  guest?: GuestBookingDetails
}

export type BookingCreated = {
  manageToken: string
  emailSent: boolean
  emailedTo?: string
  paymentMethods: PaymentMethod[]
  /**
   * The provider reviews bookings, so this one is a *request* and the slot is held
   * pending their decision. Comes off the created row, not off the provider setting —
   * the success screen must not promise a state the appointment is not in.
   */
  requiresApproval: boolean
}

type FormValues = {
  notes?: string
  paymentMethods?: PaymentMethod[]
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

type Props = {
  open: boolean
  booking: BookingSummaryData | null
  /**
   * Whether the visitor has to identify themselves. False for any signed-in caller —
   * a provider included, since the API books them against their own verified `User`.
   */
  needsGuestDetails: boolean
  /** Session still resolving. Showing the guest form here would flash it at a signed-in user. */
  isAuthPending: boolean
  /**
   * This provider reviews bookings, so the submit button asks rather than books. Read
   * from the public provider payload, which is the only way the sheet can say so
   * *before* the visitor commits — afterwards, the created row is the source.
   */
  requiresApproval: boolean
  /**
   * Methods this provider takes. Empty means they never configured a set, so the
   * picker enables every method rather than disabling the whole list.
   */
  paymentMethodOptions: PaymentMethod[]
  /** Copyable pay-to details, shown when the visitor includes bank transfer. */
  paymentInfo?: PaymentInfo | null
  isBooking: boolean
  created?: BookingCreated | null
  onClose: () => void
  onSubmit: (submission: BookingConfirmSubmission) => Promise<void>
}

/**
 * Step four: confirm, annotate, and — for a visitor with no account — say who you are.
 *
 * This is **not** the slot dialog `src/app/CLAUDE.md` rules out. That one asked *which
 * time*, so it hid the calendar it was answering behind a mask. Service, day and time
 * are all still picked in the panels and all still on screen; this opens only once
 * they are settled, and shows what was picked rather than replacing it.
 *
 * `AppSheet` (modal on md+, bottom drawer below) because this is a form the visitor
 * works inside, not a yes/no question — `AppConfirmModal` is the other half of that
 * split. It sets `destroyOnHidden`, so the inner form unmounts on close and the next
 * open starts with neither stale values nor stale validation errors.
 *
 * After a successful book the sheet title is omitted: the check + heading in the
 * body is the confirmation, and repeating it in the chrome was noise.
 */
export const BookingConfirmSheet: FC<Props> = ({
  open,
  booking,
  needsGuestDetails,
  isAuthPending,
  requiresApproval,
  paymentMethodOptions,
  paymentInfo,
  isBooking,
  created,
  onClose,
  onSubmit,
}) => {
  const t = useTranslations('Booking')
  const [sharePending, setSharePending] = useState(false)
  // The sheet stays mounted while closed. A QR generation that outlives it must
  // not lock the next open.
  if (!open && sharePending) setSharePending(false)

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={created ? undefined : t('confirmTitle')}
      pending={isBooking || isAuthPending || sharePending}
    >
      {created && booking ? (
        <BookingConfirmSuccess booking={booking} created={created} onSharePendingChange={setSharePending} />
      ) : isAuthPending || !booking ? (
        <div className='flex justify-center py-10'>
          <Spin />
        </div>
      ) : (
        <BookingConfirmForm
          booking={booking}
          needsGuestDetails={needsGuestDetails}
          requiresApproval={requiresApproval}
          paymentMethodOptions={paymentMethodOptions}
          paymentInfo={paymentInfo}
          isBooking={isBooking}
          onSubmit={onSubmit}
        />
      )}
    </AppSheet>
  )
}

type SuccessProps = {
  booking: BookingSummaryData
  created: BookingCreated
  onSharePendingChange: (pending: boolean) => void
}

const BookingConfirmSuccess: FC<SuccessProps> = ({ booking, created, onSharePendingChange }) => {
  const t = useTranslations('Booking')
  const locale = useLocale() as Locale
  const managePath = generateEntityPath(ROUTE_KEYS.bookingManage, created.manageToken)
  const manageUrl = absoluteUrl(localePath(locale, managePath))
  const summary = { ...booking, paymentMethods: created.paymentMethods }

  return (
    <div className='flex w-full flex-col gap-6'>
      <div className='flex gap-3'>
        <span
          aria-hidden
          className='bg-brand-100 text-brand flex size-12 shrink-0 items-center justify-center rounded-brand-sm'
        >
          <CheckCircleIcon className='h-6 w-6' />
        </span>
        <div className='min-w-0'>
          <AppTitle level='h3' size='h3'>
            {created.requiresApproval ? t('requestedTitle') : t('confirmedTitle')}
          </AppTitle>
          {/* The sentence that matters more than the heading: an unreviewed booking is
              done, a reviewed one is not, and the difference is what the visitor should
              expect to happen next. */}
          <AppParagraph size='body-sm' className='m-0'>
            {created.requiresApproval ? t('awaitingApprovalBody') : t('confirmedBody')}
          </AppParagraph>
          {created.emailSent && created.emailedTo ? (
            <AppParagraph size='body-sm' className='m-0'>
              {t('emailSent', { email: created.emailedTo })}
            </AppParagraph>
          ) : null}
        </div>
      </div>

      <BookingSummary {...summary} />

      <BookingShareActions manageUrl={manageUrl} booking={summary} onPendingChange={onSharePendingChange} />
    </div>
  )
}

type FormProps = Pick<
  Props,
  'needsGuestDetails' | 'paymentMethodOptions' | 'paymentInfo' | 'isBooking' | 'onSubmit' | 'requiresApproval'
> & {
  booking: BookingSummaryData
}

/**
 * Split out so it mounts and unmounts with the sheet's `destroyOnHidden`, which is what
 * makes `Form.useForm` state reset between opens without an explicit `resetFields`.
 */
const BookingConfirmForm: FC<FormProps> = ({
  booking,
  needsGuestDetails,
  requiresApproval,
  paymentMethodOptions,
  paymentInfo,
  isBooking,
  onSubmit,
}) => {
  const t = useTranslations('Booking')
  const [form] = Form.useForm<FormValues>()
  const initiallyChecked = paymentMethodOptions.length ? paymentMethodOptions : [...PAYMENT_METHODS]
  const selectedMethods = Form.useWatch('paymentMethods', form) ?? initiallyChecked

  const notesRules = useFormItemRules('maxCharsForTextarea')
  const nameRules = useFormItemRules('required', 'maxCharsForInput')
  const phoneRules = useFormItemRules('required')
  const emailRules = useFormItemRules('email')

  const handleFinish = async (values: FormValues) => {
    await onSubmit({
      notes: values.notes?.trim() || undefined,
      paymentMethods: values.paymentMethods?.length ? values.paymentMethods : undefined,
      guest: needsGuestDetails
        ? {
            firstName: values.firstName!,
            lastName: values.lastName!,
            phone: toGuestPhoneNumber(values.phone!),
            email: values.email?.trim() || undefined,
          }
        : undefined,
    })
  }

  return (
    <Form
      form={form}
      layout='vertical'
      requiredMark={false}
      initialValues={{ paymentMethods: initiallyChecked }}
      onFinish={handleFinish}
      scrollToFirstError
      disabled={isBooking}
      className='flex w-full flex-col gap-6'
    >
      <BookingSummary {...booking} paymentMethods={selectedMethods} />

      {/* Said before the commitment, not after it. A visitor who expects a confirmation
          and gets "we have passed this on" has been told the wrong thing by the button
          they pressed. */}
      {requiresApproval && (
        <Alert type='info' showIcon title={t('approvalNoticeTitle')} description={t('approvalNoticeBody')} />
      )}

      {needsGuestDetails && (
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            <AppTitle level='h3' size='body'>
              {t('guest.heading')}
            </AppTitle>
            <AppParagraph size='body-sm' className='m-0'>
              {t('guest.hint')}
            </AppParagraph>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='flex flex-col gap-1.5'>
              <FieldLabel htmlFor='booking-first-name' requirement='Required'>
                {t('guest.firstName')}
              </FieldLabel>
              <AppFormItem name='firstName' rules={nameRules} messageVariables={{ label: t('guest.firstName') }}>
                <AppInput
                  id='booking-first-name'
                  autoComplete='given-name'
                  enterKeyHint='next'
                  maxLength={MAX_CHARS_FOR_INPUT}
                />
              </AppFormItem>
            </div>

            <div className='flex flex-col gap-1.5'>
              <FieldLabel htmlFor='booking-last-name' requirement='Required'>
                {t('guest.lastName')}
              </FieldLabel>
              <AppFormItem name='lastName' rules={nameRules} messageVariables={{ label: t('guest.lastName') }}>
                <AppInput
                  id='booking-last-name'
                  autoComplete='family-name'
                  enterKeyHint='next'
                  maxLength={MAX_CHARS_FOR_INPUT}
                />
              </AppFormItem>
            </div>
          </div>

          <div className='flex flex-col gap-1.5'>
            <FieldLabel htmlFor='booking-phone' requirement='Required'>
              {t('guest.phone')}
            </FieldLabel>
            <AppFormItem name='phone' rules={phoneRules} messageVariables={{ label: t('guest.phone') }}>
              <AppInput
                id='booking-phone'
                type='tel'
                inputMode='tel'
                autoComplete='tel'
                enterKeyHint='next'
                maxLength={MAX_CHARS_FOR_INPUT}
              />
            </AppFormItem>
          </div>

          <div className='flex flex-col gap-1.5'>
            <FieldLabel
              htmlFor='booking-email'
              requirement='Optional'
              action={
                <Tooltip title={t('guest.emailHint')} trigger={['hover', 'focus', 'click']}>
                  <AppButton
                    type='text'
                    shape='circle'
                    size='small'
                    icon={<InfoIcon className='h-4 w-4' />}
                    aria-label={t('guest.emailHintLabel')}
                    className='text-brand-muted'
                  />
                </Tooltip>
              }
            >
              {t('guest.email')}
            </FieldLabel>
            <AppFormItem name='email' rules={emailRules} messageVariables={{ label: t('guest.email') }}>
              <AppInput
                id='booking-email'
                type='email'
                inputMode='email'
                autoComplete='email'
                enterKeyHint='next'
                placeholder={t('guest.emailPlaceholder')}
              />
            </AppFormItem>
          </div>
        </div>
      )}

      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-1.5'>
          <FieldLabel htmlFor='booking-payment' requirement='Optional'>
            {t('paymentLabel')}
          </FieldLabel>
          <AppFormItem name='paymentMethods' hasFeedback={false} messageVariables={{ label: t('paymentLabel') }}>
            <PaymentMethodPicker
              htmlId='booking-payment'
              accepted={paymentMethodOptions}
              disabledReason={t('paymentNotAccepted')}
            />
          </AppFormItem>
        </div>
        {selectedMethods.includes('bank_transfer') ? (
          <BankTransferDetails {...toPaymentShare(paymentInfo)} disabled={isBooking} />
        ) : null}
      </div>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='booking-notes' requirement='Optional'>
          {t('notesLabel')}
        </FieldLabel>
        {/* `maxLength` and the `maxCharsForTextarea` rule are a pair — `AppTextArea`
            draws its `12/300` crumb off `maxLength`, so one without the other desyncs
            the counter from what validation actually enforces. */}
        <AppFormItem name='notes' rules={notesRules} messageVariables={{ label: t('notesLabel') }}>
          <AppTextArea
            id='booking-notes'
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={MAX_CHARS_FOR_TEXTAREA}
            placeholder={t('notesPlaceholder')}
          />
        </AppFormItem>
      </div>

      <AppButton htmlType='submit' type='primary' loading={isBooking} className='w-full'>
        {requiresApproval ? t('submitRequest') : t('submit')}
      </AppButton>
    </Form>
  )
}

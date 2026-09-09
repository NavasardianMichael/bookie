'use client'

import { FC } from 'react'
import { FieldLabel } from '@app/[lang]/auth/components/FieldLabel'
import { PhoneNumberField } from '@app/[lang]/auth/components/PhoneNumberField'
import { Form, Spin } from 'antd'
import type { CountryCode } from 'libphonenumber-js'
import { useTranslations } from 'next-intl'
import { GuestBookingDetails } from '@api/appointments/types'
import { useFormItemRules } from '@hooks/useFormItemRules'
import { PaymentInfo, PaymentMethod } from '@interfaces/settings'
import { MAX_CHARS_FOR_INPUT, MAX_CHARS_FOR_TEXTAREA } from '@constants/form'
import { PAYMENT_METHODS } from '@constants/settings'
import { toPhoneNumber } from '@helpers/registration'
import { PaymentMethodPicker } from '@components/settings/PaymentMethodPicker'
import { AppButton } from '@components/ui/AppButton'
import { AppFormItem } from '@components/ui/AppFormItem'
import { AppInput } from '@components/ui/AppInput'
import { AppSheet } from '@components/ui/AppSheet'
import { AppTextArea } from '@components/ui/AppTextArea'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { BankTransferDetails } from './BankTransferDetails'
import { BookingSummary, BookingSummaryData } from './BookingSummary'

/** What the visitor filled in. `guest` is absent whenever we already know who they are. */
export type BookingConfirmSubmission = {
  notes?: string
  paymentMethods?: PaymentMethod[]
  guest?: GuestBookingDetails
}

/**
 * Root-level `code`/`number` are not a style choice: `PhoneNumberField` reads them off
 * the form instance by those exact names, so nesting them would silently break it.
 */
type FormValues = {
  notes?: string
  paymentMethods?: PaymentMethod[]
  firstName?: string
  lastName?: string
  email?: string
  code?: CountryCode
  number?: string
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
   * Methods this provider takes. Empty means they never configured a set, so the
   * picker enables every method rather than disabling the whole list.
   */
  paymentMethodOptions: PaymentMethod[]
  /** Copyable reference and notes, shown when the visitor includes bank transfer. */
  paymentInfo?: Pick<PaymentInfo, 'reference' | 'notes'> | null
  isBooking: boolean
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
 */
export const BookingConfirmSheet: FC<Props> = ({
  open,
  booking,
  needsGuestDetails,
  isAuthPending,
  paymentMethodOptions,
  paymentInfo,
  isBooking,
  onClose,
  onSubmit,
}) => {
  const t = useTranslations('Booking')

  return (
    <AppSheet open={open} onClose={onClose} title={t('confirmTitle')}>
      {isAuthPending || !booking ? (
        <div className='flex justify-center py-10'>
          <Spin />
        </div>
      ) : (
        <BookingConfirmForm
          booking={booking}
          needsGuestDetails={needsGuestDetails}
          paymentMethodOptions={paymentMethodOptions}
          paymentInfo={paymentInfo}
          isBooking={isBooking}
          onSubmit={onSubmit}
        />
      )}
    </AppSheet>
  )
}

type FormProps = Pick<
  Props,
  'needsGuestDetails' | 'paymentMethodOptions' | 'paymentInfo' | 'isBooking' | 'onSubmit'
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
  const emailRules = useFormItemRules('required', 'email')

  const handleFinish = async (values: FormValues) => {
    await onSubmit({
      notes: values.notes?.trim() || undefined,
      paymentMethods: values.paymentMethods?.length ? values.paymentMethods : undefined,
      guest: needsGuestDetails
        ? {
            firstName: values.firstName!,
            lastName: values.lastName!,
            // The field holds an ISO country plus a national number; the API wants a
            // dialling code plus digits, which is exactly what `toPhoneNumber` does.
            phone: toPhoneNumber(values.code!, values.number!),
            email: values.email!,
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
      className='flex w-full flex-col gap-6'
    >
      <BookingSummary {...booking} />

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
              <FieldLabel htmlFor='booking-first-name' requirement='Required' requirementText={t('requiredBadge')}>
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
              <FieldLabel htmlFor='booking-last-name' requirement='Required' requirementText={t('requiredBadge')}>
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

          <PhoneNumberField label={t('guest.phone')} requirement='Required' requirementText={t('requiredBadge')} />

          <div className='flex flex-col gap-1.5'>
            <FieldLabel htmlFor='booking-email' requirement='Required' requirementText={t('requiredBadge')}>
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
          <FieldLabel htmlFor='booking-payment' requirement='Optional' requirementText={t('optionalBadge')}>
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
          <BankTransferDetails reference={paymentInfo?.reference} notes={paymentInfo?.notes} />
        ) : null}
      </div>

      <div className='flex flex-col gap-1.5'>
        <FieldLabel htmlFor='booking-notes' requirement='Optional' requirementText={t('optionalBadge')}>
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
        {t('submit')}
      </AppButton>
    </Form>
  )
}

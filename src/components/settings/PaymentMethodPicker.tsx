'use client'

import { FC } from 'react'
import { Checkbox, Tooltip } from 'antd'
import { useTranslations } from 'next-intl'
import { PaymentMethod } from '@interfaces/settings'
import { PAYMENT_METHODS } from '@constants/settings'

type Props = {
  /**
   * Goes on a wrapper, not a checkbox. `FieldLabel htmlFor` targeting the first
   * option would toggle it when the heading is clicked; a `div` is not a control.
   * Kept separate from `id` so `Form.Item`'s injected field id cannot steal it.
   */
  htmlId?: string
  id?: string
  /** Injected by the wrapping `Form.Item`. */
  value?: PaymentMethod[]
  onChange?: (next: PaymentMethod[]) => void
  /**
   * Methods that stay enabled. Empty / omitted means the whole enum is enabled —
   * a consumer picking preferences, or a provider who never configured a set.
   */
  accepted?: PaymentMethod[]
  /** Shown on hover of a disabled option. Booking passes a translated reason. */
  disabledReason?: string
  disabled?: boolean
}

/**
 * Checkbox group of every payment method. Items sit on one row and wrap when the
 * row is too narrow. Disabled checkboxes do not fire hover, so the tooltip wraps
 * a span, not the control.
 */
export const PaymentMethodPicker: FC<Props> = ({
  htmlId,
  value,
  onChange,
  accepted = [],
  disabledReason,
  disabled,
}) => {
  const tMethods = useTranslations('Settings.payments.methods')
  const enabled: PaymentMethod[] = accepted.length ? accepted : [...PAYMENT_METHODS]
  const acceptedSet = new Set<PaymentMethod>(enabled)
  const checked = value ?? enabled

  const handleChange = (next: PaymentMethod[]) => {
    onChange?.(next.filter((method) => acceptedSet.has(method)))
  }

  return (
    <div id={htmlId}>
      <Checkbox.Group<PaymentMethod>
        value={checked}
        onChange={handleChange}
        disabled={disabled}
        className='flex flex-wrap items-center gap-x-4 gap-y-2'
      >
        {PAYMENT_METHODS.map((method) => {
          const isAccepted = acceptedSet.has(method)
          const checkbox = (
            <Checkbox value={method} disabled={!isAccepted}>
              {tMethods(method)}
            </Checkbox>
          )

          if (isAccepted || !disabledReason) {
            return (
              <span key={method} className='inline-flex w-fit'>
                {checkbox}
              </span>
            )
          }

          return (
            <Tooltip key={method} title={disabledReason}>
              <span className='inline-flex w-fit'>{checkbox}</span>
            </Tooltip>
          )
        })}
      </Checkbox.Group>
    </div>
  )
}

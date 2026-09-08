'use client'

import { FC, useMemo } from 'react'
import { AutoComplete } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { minsToDisplayFormat } from '@constants/dates'

/** Offered as suggestions; a provider can still type any whole minute count. */
const DURATION_SUGGESTIONS_MINUTES = [15, 20, 30, 45, 60, 90, 120]

type Props = {
  /** Whole minutes. Injected by the wrapping `Form.Item`. */
  value?: number
  onChange?: (next: number | undefined) => void
  disabled?: boolean
}

const toOption = (minutes: number): DefaultOptionType => ({
  value: String(minutes),
  label: minsToDisplayFormat(minutes).text || `${minutes} minutes`,
})

export const ProviderServiceFormDuration: FC<Props> = ({ value, onChange, disabled }) => {
  const options: DefaultOptionType[] = useMemo(() => {
    const withCurrent = value && value > 0 ? [value, ...DURATION_SUGGESTIONS_MINUTES] : DURATION_SUGGESTIONS_MINUTES
    return [...new Set(withCurrent)].sort((a, b) => a - b).map(toOption)
  }, [value])

  /**
   * Commits on every keystroke, not only on select — typing `45` and submitting without
   * opening the dropdown has to save 45. Anything that is not a whole positive minute
   * count is dropped rather than stored, so the field can never hold a value the API
   * would reject.
   */
  const handleChange = (next: string): void => {
    const trimmed = next.trim()
    if (!trimmed) {
      onChange?.(undefined)
      return
    }

    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed <= 0) return

    onChange?.(parsed)
  }

  return (
    <AutoComplete
      value={value === undefined ? '' : String(value)}
      onChange={handleChange}
      options={options}
      disabled={disabled}
      placeholder='30'
      // Options are already derived from the current value, so antd's own substring
      // filter would only hide the suggestions.
      showSearch={{ filterOption: false }}
      suffixIcon={<span className='mr-2'>minutes</span>}
      className='w-full'
    />
  )
}

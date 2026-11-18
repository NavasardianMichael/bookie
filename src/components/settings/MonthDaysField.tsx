'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { MONTH_DAYS } from '@constants/serviceAvailability'
import { cn } from '@helpers/cn'

/** Days of the month picked: 1–31, and the month's last day whatever its number. */
export type MonthDaysPick = { days: number[]; lastDay?: boolean }

type Props = {
  /** Injected by the wrapping `Form.Item`. */
  value?: MonthDaysPick
  onChange?: (next: MonthDaysPick) => void
  disabled?: boolean
  /** Names the group for assistive tech. */
  label: string
}

const chip = (selected: boolean) =>
  cn(
    'border-brand-border flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-brand-sm border px-2 text-body-sm transition-colors',
    'hover:border-brand disabled:cursor-not-allowed disabled:opacity-60',
    selected ? 'bg-brand border-brand text-white' : 'bg-surface text-brand-text'
  )

/**
 * Days of the month as a calendar-like grid of toggles — 1 to 31, then "Last day" — for a rule
 * that repeats monthly (the provider's hours, a service's days). Each toggle is a button with
 * `aria-pressed`, so the pick reads as a set of switches. A custom field on the antd control
 * contract (`value` / `onChange`), bound by a `Form.Item`.
 */
export const MonthDaysField: FC<Props> = ({ value, onChange, disabled = false, label }) => {
  const t = useTranslations('Settings.availability.schedule')
  const days = value?.days ?? []
  const lastDay = Boolean(value?.lastDay)

  const toggleDay = (day: number): void => {
    const next = days.includes(day) ? days.filter((other) => other !== day) : [...days, day].sort((a, b) => a - b)
    onChange?.({ days: next, ...(lastDay ? { lastDay } : {}) })
  }

  return (
    <div role='group' aria-label={label} className='flex flex-col gap-2'>
      <div className='grid max-w-sm grid-cols-7 gap-1.5'>
        {MONTH_DAYS.map((day) => (
          <button
            key={day}
            type='button'
            aria-pressed={days.includes(day)}
            disabled={disabled}
            className={chip(days.includes(day))}
            onClick={() => toggleDay(day)}
          >
            {day}
          </button>
        ))}
      </div>
      <button
        type='button'
        aria-pressed={lastDay}
        disabled={disabled}
        className={cn(chip(lastDay), 'self-start px-3')}
        onClick={() => onChange?.({ days, ...(lastDay ? {} : { lastDay: true }) })}
      >
        {t('lastDay')}
      </button>
    </div>
  )
}

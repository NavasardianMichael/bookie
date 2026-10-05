'use client'

import { FC, useMemo } from 'react'
import { Select } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { matchesSearch } from '@helpers/search'
import { formatTimeZoneName, formatUtcOffset, listTimeZones, zoneOffsetMs } from '@helpers/timeZone'

/**
 * `value` and `onChange` are **injected by `Form.Item`** — the control contract every custom
 * field here implements (see the `forms` skill). Used by onboarding's `ProviderProfileForm`
 * and the Availability tab, the two places hours are written.
 */
type Props = {
  value?: string
  onChange?: (next: string) => void
  disabled?: boolean
  id?: string
}

type TimeZoneOption = {
  value: string
  label: string
  /** The label plus `Intl`'s localised name, so "Armenia" or "日本標準時" finds a zone too. */
  searchText: string
  offsetMs: number
}

/**
 * Labelling ~420 zones costs tens of milliseconds of `Intl` work, so it is done once per
 * locale rather than per render. Offsets are read once too: a picker left open across a DST
 * change shows last week's `GMT+1` until reload, which is harmless for choosing a zone.
 */
const optionsByLocale = new Map<string, TimeZoneOption[]>()

const buildOption = (zone: string, locale: string, now: Date): TimeZoneOption => {
  const label = `(${formatUtcOffset(zone, locale, now)}) ${zone.replaceAll('_', ' ')}`
  return {
    value: zone,
    label,
    searchText: `${label} ${formatTimeZoneName(zone, locale, now)}`,
    offsetMs: zoneOffsetMs(now, zone),
  }
}

const getOptions = (locale: string): TimeZoneOption[] => {
  const cached = optionsByLocale.get(locale)
  if (cached) return cached

  const now = new Date()
  const options = listTimeZones()
    .map((zone) => buildOption(zone, locale, now))
    // West to east, the way every zone picker reads — searching is the fast path anyway.
    .sort((left, right) => left.offsetMs - right.offsetMs || left.value.localeCompare(right.value))
  optionsByLocale.set(locale, options)
  return options
}

/**
 * The zone a provider's hours are written in — searchable by city, offset or zone name.
 *
 * A stored zone the browser's catalogue spells differently (the API keeps Node's
 * `Asia/Calcutta`; a browser may list only `Asia/Kolkata`) is added on top, so the select
 * never renders a bare id for a value it has no option for.
 */
export const ProviderProfileTimeZone: FC<Props> = ({ value, onChange, disabled, id }) => {
  const t = useTranslations('Settings.availability')
  const locale = useLocale()

  const options = useMemo(() => {
    const base = getOptions(locale)
    return value && !base.some((option) => option.value === value)
      ? [buildOption(value, locale, new Date()), ...base]
      : base
  }, [locale, value])

  return (
    <Select<string, TimeZoneOption>
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={options}
      placeholder={t('timeZonePlaceholder')}
      showSearch={{ filterOption: (input, option) => matchesSearch(option?.searchText ?? '', input) }}
      className='w-full'
    />
  )
}

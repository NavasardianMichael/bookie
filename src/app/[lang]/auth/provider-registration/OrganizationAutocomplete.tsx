'use client'

import { FC, useCallback, useState } from 'react'
import { AutoComplete, Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { searchOrganizationsAPI } from '@api/organizations/main'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { OrganizationValue } from '@interfaces/auth'
import { reportError } from '@helpers/reportError'
import { AppText } from '@components/ui/bare/AppText'
import { BuildingIcon } from '@components/ui/icons'

type Props = {
  /** Injected by `Form.Item` — never pass these from a call site. */
  value?: OrganizationValue
  onChange?: (next: OrganizationValue) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

type Option = { value: string; id: string }

/**
 * The provider registration form's Organization field: search existing organizations as you
 * type, pick one, or keep your own text to create a new one.
 *
 * Implements the `Form.Item` control contract — `value` and `onChange` arrive as props and
 * are handed to the real control. It must not be wrapped in a layout element inside the
 * `Form.Item`, or antd clones that wrapper and lands `value`/`onChange` on a `<div>`.
 *
 * The id is resolved by matching the current text against the fetched options rather than in
 * `onSelect`. That keeps it independent of whether antd fires `onSelect` before or after
 * `onChange`, and it means typing an existing organization's name exactly still links it
 * instead of creating a duplicate. The server repeats the same case-insensitive match as a
 * backstop.
 */
export const OrganizationAutocomplete: FC<Props> = ({ value, onChange, placeholder, disabled, id }) => {
  const t = useTranslations('Errors')
  const [options, setOptions] = useState<Option[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)

  const runSearch = useCallback(async (query: string) => {
    setSearchFailed(false)
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setOptions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const organizations = await searchOrganizationsAPI({ query: query.trim() })
      setOptions(organizations.map((organization) => ({ value: organization.basic.name, id: organization.id })))
    } catch (error) {
      // A failed lookup must not block registration — the typed name still creates an
      // organization, so the field degrades to plain text and the dropdown says why it is
      // empty, rather than the form showing an error.
      reportError(error, 'OrganizationAutocomplete:search')
      setOptions([])
      setSearchFailed(true)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const debouncedSearch = useDebouncedCallback(runSearch, SEARCH_DEBOUNCE_MS)

  const handleChange = (name: string) => {
    const matched = options.find((option) => option.value.trim().toLowerCase() === name.trim().toLowerCase())
    onChange?.({ id: matched?.id, name })
  }

  return (
    <AutoComplete
      id={id}
      value={value?.name ?? ''}
      options={options}
      showSearch={{ onSearch: debouncedSearch, filterOption: false }}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      notFoundContent={
        isSearching ? (
          <Spin size='small' />
        ) : searchFailed ? (
          <AppText size='caption' tone='muted'>
            {t('sections.organizationSearch')}
          </AppText>
        ) : null
      }
      className='w-full'
      prefix={<BuildingIcon className='text-brand-muted h-4 w-4' />}
    />
  )
}

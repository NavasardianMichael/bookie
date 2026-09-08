'use client'

import { FC, useMemo } from 'react'
import { AutoComplete } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { useCategoriesListStore } from '@store/categories/list/store'
import { CategoryValue } from '@interfaces/services'

type Props = {
  /** `value` and `onChange` are injected by the wrapping `Form.Item`. */
  value?: CategoryValue
  onChange?: (next: CategoryValue) => void
  disabled?: boolean
  id?: string
}

const matchesQuery = (input: string, option?: DefaultOptionType): boolean => {
  const query = input.trim().toLowerCase()
  if (!query) return true
  const haystack = String(option?.value ?? '').toLowerCase()
  return haystack.includes(query)
}

/**
 * Combobox over the predefined Category rows (the same ones linked to organizations
 * and providers), plus free text. Typing an existing name case-insensitively still
 * links it; any other name is created on save.
 *
 * The id is resolved by matching the current text against the loaded list rather than
 * in `onSelect`, the same as OrganizationAutocomplete — so antd's event order cannot
 * drop the link, and an exact typed name does not create a duplicate.
 */
export const ProviderServiceFormCategory: FC<Props> = ({ value, onChange, disabled, id }) => {
  const list = useCategoriesListStore.use.list()

  const options: DefaultOptionType[] = useMemo(
    () =>
      list.allIds.flatMap((categoryId) => {
        const category = list.byId[categoryId]
        return category ? [{ value: category.name }] : []
      }),
    [list.allIds, list.byId]
  )

  const handleChange = (name: string | undefined) => {
    const next = name ?? ''
    const matched = list.allIds
      .map((categoryId) => list.byId[categoryId])
      .find((category) => category?.name.trim().toLowerCase() === next.trim().toLowerCase())
    onChange?.({ id: matched?.id, name: next })
  }

  return (
    <AutoComplete
      id={id}
      value={value?.name ?? ''}
      onChange={handleChange}
      options={options}
      disabled={disabled}
      placeholder='Type or pick a category'
      allowClear
      showSearch={{ filterOption: matchesQuery }}
      className='w-full'
    />
  )
}

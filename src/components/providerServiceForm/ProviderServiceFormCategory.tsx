'use client'

import { FC, useMemo } from 'react'
import { AutoComplete } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import { useTranslations } from 'next-intl'
import { useCategoriesListStore } from '@store/categories/list/store'
import { CategoryValue } from '@interfaces/services'
import { isSameName, matchesSearch } from '@helpers/search'

type Props = {
  /** `value` and `onChange` are injected by the wrapping `Form.Item`. */
  value?: CategoryValue
  onChange?: (next: CategoryValue) => void
  disabled?: boolean
  id?: string
}

/** Case, accents and spacing ignored; a typo or two and any word order tolerated. */
const matchesQuery = (input: string, option?: DefaultOptionType): boolean =>
  matchesSearch(String(option?.value ?? ''), input)

/**
 * Combobox over the predefined Category rows (the same ones linked to organizations
 * and providers), plus free text. Typing an existing name — whatever its case, spacing,
 * accents or punctuation (`isSameName`) — still links it; any other name is created on
 * save, and the server applies the same comparison before it creates one.
 *
 * The id is resolved by matching the current text against the loaded list rather than
 * in `onSelect` — so antd's event order cannot
 * drop the link, and an exact typed name does not create a duplicate.
 */
export const ProviderServiceFormCategory: FC<Props> = ({ value, onChange, disabled, id }) => {
  const t = useTranslations('Services')
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
      .find((category) => category && isSameName(category.name, next))
    onChange?.({ id: matched?.id, name: next })
  }

  return (
    <AutoComplete
      id={id}
      value={value?.name ?? ''}
      onChange={handleChange}
      options={options}
      disabled={disabled}
      placeholder={t('categoryPlaceholder')}
      allowClear
      showSearch={{ filterOption: matchesQuery }}
      className='w-full'
    />
  )
}

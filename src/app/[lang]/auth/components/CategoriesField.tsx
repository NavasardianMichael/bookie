'use client'

import { FC, ReactNode, Ref, useState } from 'react'
import { PlusOutlined, TagOutlined } from '@ant-design/icons'
import { Select, Spin } from 'antd'
import type { RefSelectProps } from 'antd/es/select'
import { useTranslations } from 'next-intl'
import { CategoryValue } from '@interfaces/auth'
import { MAX_CHARS_FOR_CATEGORY_NAME, MAX_PROVIDER_CATEGORIES } from '@constants/form'
import { translateCategoryName } from '@helpers/categoryName'
import { collapseWhitespace, isSameName } from '@helpers/search'
import { AppText } from '@components/ui/bare/AppText'
import { useCategorySuggestions } from './useCategorySuggestions'

type Props = {
  /** Injected by `Form.Item` — never pass these from a call site. */
  value?: CategoryValue[]
  onChange?: (next: CategoryValue[]) => void
  /** Composed by `Form.Item` with its own, so `scrollToFirstError` can focus the control. */
  ref?: Ref<RefSelectProps>
  id?: string
  disabled?: boolean
}

/** The add-new row's value. Cannot collide with a UUID, nor with a `new:` key. */
const ADD_NEW_OPTION = 'add-new-category'
const STATUS_OPTION = 'category-search-status'

const ADD_NEW_OPTION_STYLE = { borderStartStartRadius: 0, borderStartEndRadius: 0 }

/** `Select` keys: a category's id, or `new:<name>` for one the provider is adding. */
const keyOf = (entry: CategoryValue): string => entry.id ?? `new:${entry.name}`

type Labeled = { value: string; label: ReactNode }

/**
 * A provider's categories — up to `MAX_PROVIDER_CATEGORIES`, all optional — as antd's
 * multiple `Select`: type to search, pick a suggestion or add the typed name as a new
 * category, and each choice becomes a tag inside the input with its own remove icon.
 * `maxCount` disables the rest of the list once three are chosen; a chosen one can still be
 * removed from its tag or deselected in the list.
 *
 * Suggestions come from the API as the provider types (`useCategorySuggestions`), never from
 * the options' own text, so `filterOption` is off. Predefined categories show their
 * translated name, added ones the name they were given — and a category being added carries
 * a "new" mark on its tag. "Add as new" is offered even beside a near match — whether that was
 * meant is asked on submit (`useSimilarCategoryCheck`) — but not for a name already chosen.
 *
 * `labelInValue`, so a saved category the current search did not return still shows its
 * label. Implements the `Form.Item` control contract, so it must not be wrapped in a layout
 * element inside the item.
 */
export const CategoriesField: FC<Props> = ({ value, onChange, ref, id, disabled }) => {
  const t = useTranslations('Auth.categories')
  const tCategories = useTranslations('Categories')
  const tErrors = useTranslations('Errors')
  const chosen = value ?? []
  const [text, setText] = useState('')
  const query = collapseWhitespace(text).slice(0, MAX_CHARS_FOR_CATEGORY_NAME)
  const suggestions = useCategorySuggestions(text)

  const label = (name: string) => translateCategoryName(name, tCategories)
  const isChosen = (name: string) =>
    chosen.some((entry) => isSameName(entry.name, name) || isSameName(label(entry.name), name))

  const tagLabel = (entry: CategoryValue): ReactNode =>
    entry.isNew ? (
      <span>
        {label(entry.name)}
        <span className='text-brand-muted ms-1'>· {t('newBadge')}</span>
      </span>
    ) : (
      label(entry.name)
    )

  const selected: Labeled[] = chosen.map((entry) => ({ value: keyOf(entry), label: tagLabel(entry) }))

  /**
   * Back from `Select`'s keys to entries. A key already chosen keeps its entry; the add-new
   * row becomes the typed name; any other key is a suggestion picked just now.
   */
  const handleChange = (next: Labeled[]) => {
    const entries = next.flatMap((item): CategoryValue[] => {
      const kept = chosen.find((entry) => keyOf(entry) === item.value)
      if (kept) return [kept]
      if (item.value === ADD_NEW_OPTION) return query ? [{ name: query, isNew: true }] : []
      const picked = suggestions.categories.find((category) => category.id === item.value)
      return picked ? [{ id: picked.id, name: picked.name }] : []
    })
    setText('')
    onChange?.(entries.slice(0, MAX_PROVIDER_CATEGORIES))
  }

  const categoryOptions = suggestions.categories.map((category) => ({
    value: category.id,
    // rc-select's accessible listbox would otherwise announce the value — an id.
    'aria-label': label(category.name),
    label: label(category.name),
  }))

  const statusOption = {
    value: STATUS_OPTION,
    disabled: true,
    label: suggestions.isLoading ? (
      <Spin size='small' />
    ) : (
      <AppText size='caption' tone='muted'>
        {suggestions.failed ? tErrors('sections.categorySearch') : t('noMatches')}
      </AppText>
    ),
  }

  const canAddNew = Boolean(query) && !isChosen(query)

  // Nothing typed: no options, and `notFoundContent={null}` keeps the list shut.
  const options = suggestions.isIdle
    ? []
    : [
        ...(categoryOptions.length ? categoryOptions : [statusOption]),
        ...(canAddNew
          ? [
              {
                value: ADD_NEW_OPTION,
                'aria-label': t('addNew', { name: query }),
                // Its own block under the matches, as in the Organization field: a divider
                // above it, square top corners so the rule runs straight.
                className: 'border-brand-border mt-1 border-t',
                style: ADD_NEW_OPTION_STYLE,
                label: (
                  <span className='text-brand flex items-center gap-2 font-semibold'>
                    <PlusOutlined />
                    <span className='truncate'>{t('addNew', { name: query })}</span>
                  </span>
                ),
              },
            ]
          : []),
      ]

  return (
    <Select<Labeled[]>
      ref={ref}
      id={id}
      mode='multiple'
      labelInValue
      value={selected}
      onChange={handleChange}
      options={options}
      showSearch={{ searchValue: text, onSearch: setText, filterOption: false }}
      maxCount={MAX_PROVIDER_CATEGORIES}
      notFoundContent={null}
      placeholder={t('searchPlaceholder')}
      disabled={disabled}
      prefix={<TagOutlined className='text-brand-muted' />}
      className='w-full'
    />
  )
}

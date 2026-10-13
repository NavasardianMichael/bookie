'use client'

import { FC, Ref, useState } from 'react'
import { CloseOutlined, PlusOutlined, TagOutlined } from '@ant-design/icons'
import { AutoComplete, Spin, Tag } from 'antd'
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

/** Option values that are not category ids. Neither can collide with a UUID. */
const ADD_NEW_OPTION = 'add-new-category'
const STATUS_OPTION = 'category-search-status'

const ADD_NEW_OPTION_STYLE = { borderStartStartRadius: 0, borderStartEndRadius: 0 }

/**
 * A provider's categories — up to `MAX_PROVIDER_CATEGORIES`, all optional. The Organization
 * field's interaction, made multiple: type to search, then pick a suggestion or add the
 * typed name as a new category; every choice becomes a chip with its own remove button, and
 * the search box empties for the next one. Full, the box is disabled and says why.
 *
 * Suggestions and chips show a predefined category under its translated name, an added one
 * under the name it was given. "Add as new" is offered even beside a near match — whether
 * that was meant is asked on submit (`useSimilarCategoryCheck`) — but not for a name that is
 * already a chip, nor are the categories already chosen suggested again.
 *
 * Implements the `Form.Item` control contract, so it must not be wrapped in a layout element
 * inside the item.
 */
export const CategoriesField: FC<Props> = ({ value, onChange, ref, id, disabled }) => {
  const t = useTranslations('Auth.categories')
  const tCategories = useTranslations('Categories')
  const tErrors = useTranslations('Errors')
  const chosen = value ?? []
  const [text, setText] = useState('')
  const query = collapseWhitespace(text)
  const suggestions = useCategorySuggestions(text)
  const full = chosen.length >= MAX_PROVIDER_CATEGORIES

  const label = (name: string) => translateCategoryName(name, tCategories)
  const isChosen = (name: string) => chosen.some((entry) => isSameName(entry.name, name) || isSameName(label(entry.name), name))

  const available = suggestions.categories.filter((category) => !chosen.some((entry) => entry.id === category.id))

  const add = (entry: CategoryValue) => {
    setText('')
    if (full) return
    onChange?.([...chosen, entry])
  }

  const handleSelect = (selected: string) => {
    if (selected === ADD_NEW_OPTION) {
      add({ name: query, isNew: true })
      return
    }
    const category = available.find((candidate) => candidate.id === selected)
    if (category) add({ id: category.id, name: category.name })
  }

  const remove = (index: number) => onChange?.(chosen.filter((_, position) => position !== index))

  const categoryOptions = available.map((category) => ({
    value: category.id,
    // rc-select's accessible listbox would otherwise announce the value — an id.
    'aria-label': label(category.name),
    label: (
      <AppText size='body-sm' className='truncate'>
        {label(category.name)}
      </AppText>
    ),
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
    <div className='flex flex-col gap-2'>
      <AutoComplete
        ref={ref}
        id={id}
        value={text}
        options={options}
        showSearch={{ onSearch: setText, filterOption: false }}
        onSelect={handleSelect}
        placeholder={full ? t('full', { max: MAX_PROVIDER_CATEGORIES }) : t('searchPlaceholder')}
        disabled={disabled || full}
        maxLength={MAX_CHARS_FOR_CATEGORY_NAME}
        className='w-full'
        prefix={<TagOutlined className='text-brand-muted' />}
      />

      {chosen.length > 0 && (
        <ul className='flex flex-wrap gap-2' aria-label={t('chosen')}>
          {chosen.map((entry, index) => (
            <li key={entry.id ?? `new:${entry.name}`}>
              <Tag
                className='m-0'
                color={entry.isNew ? undefined : 'blue'}
                disabled={disabled}
                closeIcon={<CloseOutlined aria-label={t('remove', { name: label(entry.name) })} />}
                onClose={(event) => {
                  // The list is rendered from `value`; Tag must not also hide itself.
                  event.preventDefault()
                  remove(index)
                }}
              >
                {label(entry.name)}
                {entry.isNew && <span className='text-brand-muted ms-1'>· {t('newBadge')}</span>}
              </Tag>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

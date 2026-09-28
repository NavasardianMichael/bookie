'use client'

import { FC, Ref } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { AutoComplete, Spin } from 'antd'
import type { RefSelectProps } from 'antd/es/select'
import { useTranslations } from 'next-intl'
import { BasicOrganization } from '@store/organizations/single/types'
import { OrganizationValue } from '@interfaces/auth'
import { MAX_CHARS_FOR_ORGANIZATION_NAME } from '@constants/form'
import { collapseWhitespace } from '@helpers/search'
import { AppText } from '@components/ui/bare/AppText'
import { BuildingIcon } from '@components/ui/icons'
import { useOrganizationSuggestions } from './useOrganizationSuggestions'

type Props = {
  /** Injected by `Form.Item` — never pass these from a call site. */
  value?: OrganizationValue
  onChange?: (next: OrganizationValue) => void
  /** Composed by `Form.Item` with its own, so `scrollToFirstError` can focus the control. */
  ref?: Ref<RefSelectProps>
  id?: string
  placeholder?: string
  disabled?: boolean
}

/** Option values that are not organization ids. Neither can collide with a UUID. */
const ADD_NEW_OPTION = 'add-new-organization'
const STATUS_OPTION = 'organization-search-status'

const ADD_NEW_OPTION_STYLE = { borderStartStartRadius: 0, borderStartEndRadius: 0 }

const OrganizationOptionLabel: FC<{ organization: BasicOrganization }> = ({ organization }) => {
  const categories = organization.basic.categories.map((category) => category.name).join(', ')

  return (
    <span className='flex min-w-0 flex-col'>
      <AppText as='strong' size='body-sm' className='truncate leading-snug'>
        {organization.basic.name}
      </AppText>
      {categories && (
        <AppText size='caption' tone='muted' className='truncate leading-snug'>
          {categories}
        </AppText>
      )}
    </span>
  )
}

/**
 * The registration Organization field: type to search, then either pick an existing
 * organization or choose to add the typed name as a new one. Typing alone resolves nothing —
 * the value stays unresolved until one of those two picks, and validation says so.
 *
 * Options are keyed by organization **id**, not name: two organizations may share a name,
 * and a name key would collapse them. The input still shows the name, because `value` is
 * controlled and a pick writes the name back in the same event. Typing arrives through
 * `onSearch` and picks through `onSelect`, as in Explore's `ProviderSearchField`; the
 * combobox's own `onChange` (which reports the picked option's value, an id) is not used.
 *
 * "Add as new" is an option rather than a button under the list, so the keyboard reaches it,
 * and it is offered even when a suggestion carries the same name: two real organizations can
 * share one. Whether that was meant is asked on submit (`useSimilarOrganizationCheck`).
 *
 * Implements the `Form.Item` control contract, so it must not be wrapped in a layout element
 * inside the item.
 */
export const OrganizationSearchField: FC<Props> = ({ value, onChange, ref, id, placeholder, disabled }) => {
  const t = useTranslations('Auth.organization')
  const tErrors = useTranslations('Errors')
  const name = value?.name ?? ''
  const query = collapseWhitespace(name)
  const suggestions = useOrganizationSuggestions(name)
  const { organizations } = suggestions

  // Typing keeps a chosen "new" — the provider is still naming the organization they are
  // adding — but drops a picked id, whose name no longer matches the text.
  const handleSearch = (text: string) => onChange?.({ name: text, isNew: value?.isNew })

  const handleSelect = (selected: string) => {
    if (selected === ADD_NEW_OPTION) {
      onChange?.({ name: query, isNew: true })
      return
    }
    const organization = organizations.find((candidate) => candidate.id === selected)
    if (organization) onChange?.({ id: organization.id, name: organization.basic.name })
  }

  const organizationOptions = organizations.map((organization) => ({
    value: organization.id,
    // rc-select's accessible listbox would otherwise announce the value — an id.
    'aria-label': organization.basic.name,
    label: <OrganizationOptionLabel organization={organization} />,
  }))

  const statusOption = {
    value: STATUS_OPTION,
    disabled: true,
    label: suggestions.isLoading ? (
      <Spin size='small' />
    ) : (
      <AppText size='caption' tone='muted'>
        {suggestions.failed ? tErrors('sections.organizationSearch') : t('noMatches')}
      </AppText>
    ),
  }

  const canAddNew = !value?.isNew

  const options = suggestions.isIdle
    ? []
    : [
        ...(organizationOptions.length ? organizationOptions : [statusOption]),
        ...(canAddNew
          ? [
              {
                value: ADD_NEW_OPTION,
                'aria-label': t('addNew', { name: query }),
                // Its own block under the matches: a divider above it, and square top corners
                // so the rule runs straight. Inline because antd's option radius is unlayered.
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
    <AutoComplete
      ref={ref}
      id={id}
      value={name}
      options={options}
      showSearch={{ onSearch: handleSearch, filterOption: false }}
      onSelect={handleSelect}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={MAX_CHARS_FOR_ORGANIZATION_NAME}
      className='w-full'
      prefix={<BuildingIcon className='text-brand-muted h-4 w-4' />}
    />
  )
}

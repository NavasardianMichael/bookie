'use client'

import { FC, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons'
import { AutoComplete, Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useRouter } from '@i18n/navigation'
import { ROUTE_KEYS } from '@constants/routes'
import { generateEntityPath } from '@helpers/entities'
import { AppButton } from '@components/ui/AppButton'
import { AppInput } from '@components/ui/AppInput'
import { AppText } from '@components/ui/bare/AppText'
import { buildExploreHref, ExploreParams } from './exploreParams'
import { useExplorePending } from './ExplorePending'
import { ProviderSuggestionOption } from './ProviderSuggestionOption'
import { useProviderSuggestions } from './useProviderSuggestions'

type Props = {
  params: ExploreParams
}

/**
 * Explore's search box: typing suggests, submitting searches.
 *
 * While the visitor types, an antd `AutoComplete` offers the first few matching providers
 * (`useProviderSuggestions`), and picking one opens that provider's page. The grid below
 * does not move: it re-renders only on **Enter** or the **Search** button, which close the
 * dropdown and write `?q=` to the URL. A Server Component round-trip per keystroke was
 * the old cost of live results; a five-row client fetch is the new one.
 *
 * The input is locally controlled and the URL is its output. `params.q` seeds the first
 * render and is written back only when the URL changes from *outside* this field — Clear
 * all filters, Back — so a keyword the address bar dropped cannot sit in the box and look
 * like it is still on. `committedRef` is how the field tells that apart from its own
 * submit landing, which must not overwrite whatever was typed since.
 *
 * `replace` rather than `push`, like sort and filter, and `scroll: false` so the results
 * stay in view.
 */
export const ProviderSearchField: FC<Props> = ({ params }) => {
  const t = useTranslations('Explore')
  const tErrors = useTranslations('Errors')
  const router = useRouter()
  const { isPending, startTransition } = useExplorePending()
  const [value, setValue] = useState(params.q)
  const [isOpen, setIsOpen] = useState(false)
  const committedRef = useRef(params.q)
  const suggestions = useProviderSuggestions(params, value)

  useEffect(() => {
    if (params.q === committedRef.current) return
    committedRef.current = params.q
    setValue(params.q)
  }, [params.q])

  const submit = (text: string) => {
    const query = text.trim()
    committedRef.current = query
    setIsOpen(false)
    startTransition(() => {
      router.replace(buildExploreHref(params, { q: query }), { scroll: false })
    })
  }

  const openProvider = (providerId: string) => {
    startTransition(() => {
      router.push(generateEntityPath(ROUTE_KEYS.providers, providerId))
    })
  }

  /**
   * Runs after rc-select has handled the key. An Enter that picked a highlighted
   * suggestion arrives `defaultPrevented` and belongs to `onSelect`; anything else is a
   * submit. Handling it here rather than in the form's `onSubmit` lands `setIsOpen(false)`
   * in the same batch as the reopen rc-select fires for an Enter on a closed list, so the
   * dropdown does not flash. `preventDefault` then stops the form submitting it twice.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing) return
    // The key bubbles from anywhere inside the select root; only the text box submits.
    if (!(event.target instanceof HTMLInputElement)) return
    event.preventDefault()
    submit(value)
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit(value)
  }

  const options = suggestions.providers.map((provider) => {
    const name = `${provider.basic.firstName} ${provider.basic.lastName}`
    return {
      value: provider.id,
      // rc-select's hidden accessible listbox would otherwise announce the option's
      // value — a provider id.
      'aria-label': name,
      label: <ProviderSuggestionOption provider={provider} name={name} />,
    }
  })

  const notFoundContent = suggestions.isIdle ? null : suggestions.isLoading ? (
    <Spin size='small' />
  ) : (
    <AppText size='caption' tone='muted'>
      {suggestions.failed ? tErrors('sections.providerSuggestions') : t('noSuggestions')}
    </AppText>
  )

  return (
    <form role='search' onSubmit={handleFormSubmit} className='flex w-full gap-2'>
      <AutoComplete
        value={value}
        options={options}
        open={isOpen}
        onOpenChange={setIsOpen}
        showSearch={{ onSearch: setValue, filterOption: false }}
        onSelect={openProvider}
        onKeyDown={handleKeyDown}
        notFoundContent={notFoundContent}
        className='min-w-0 flex-1'
      >
        <AppInput
          allowClear
          // Emptying the box by hand is still just typing; the clear button is a
          // deliberate reset, so it submits.
          onClear={() => submit('')}
          size='large'
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          prefix={<SearchOutlined className='text-brand-muted mr-3 ml-2 py-2' />}
          // A suffix that mounts and unmounts would remount the input and drop focus, so
          // the idle state is a same-sized spacer rather than nothing.
          suffix={isPending ? <LoadingOutlined className='text-brand-muted' /> : <span className='size-4' />}
        />
      </AutoComplete>
      <AppButton
        type='primary'
        htmlType='submit'
        size='large'
        icon={<SearchOutlined />}
        aria-label={t('searchButton')}
        // antd pins a large button at `controlHeightLG`, and the padded prefix icon makes
        // this field taller than that. `auto` hands the height back to the row's stretch,
        // so the button matches the field without a second magic number. Inline because a
        // Tailwind class cannot beat antd's unlayered CSS.
        style={{ height: 'auto' }}
      >
        <span className='hidden sm:inline'>{t('searchButton')}</span>
      </AppButton>
    </form>
  )
}

'use client'

import { FC, useState, useTransition } from 'react'
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { useRouter } from '@i18n/navigation'
import { AppInput } from '@components/ui/AppInput'
import { buildExploreHref, ExploreParams } from './exploreParams'

type Props = {
  params: ExploreParams
  placeholder: string
  /** Accessible name — the field carries no visible label. */
  label: string
}

/**
 * A keystroke is not a query. 350ms is long enough that a typed word costs one request
 * instead of five, and short enough that it reads as live filtering rather than a
 * submit.
 */
const SEARCH_DEBOUNCE_MS = 350

/**
 * Explore's search box.
 *
 * The input is locally controlled and the URL is the *result*, not the source: typing has
 * to stay at 60fps while a server round-trip is in flight, so the caret cannot wait for
 * `searchParams` to come back. `params.q` seeds the first render only, which is also what
 * makes a shared `?q=` URL arrive with its text in the box.
 *
 * `replace` rather than `push`, so a nine-character search leaves one history entry
 * instead of nine and Back returns to wherever the visitor came from. `scroll: false`
 * keeps the results in view — re-anchoring to the top on every keystroke would fight the
 * typing.
 */
export const ProviderSearchField: FC<Props> = ({ params, placeholder, label }) => {
  const router = useRouter()
  const [value, setValue] = useState(params.q)
  const [isPending, startTransition] = useTransition()

  const commit = useDebouncedCallback((query: string) => {
    startTransition(() => {
      router.replace(buildExploreHref(params, { q: query.trim() }), { scroll: false })
    })
  }, SEARCH_DEBOUNCE_MS)

  const handleChange = (next: string) => {
    setValue(next)
    commit(next)
  }

  return (
    <AppInput
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      // antd renders its own clear button, so `type='search'` would put a second one
      // beside it in Chrome. `onClear` is the route that button takes.
      onClear={() => handleChange('')}
      allowClear
      size='large'
      aria-label={label}
      placeholder={placeholder}
      prefix={<SearchOutlined className='text-brand-muted' />}
      suffix={isPending ? <LoadingOutlined className='text-brand-muted' /> : <span className='size-4' />}
    />
  )
}

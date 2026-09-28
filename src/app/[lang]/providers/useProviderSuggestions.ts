'use client'

import { useMemo } from 'react'
import { getProvidersListAPI } from '@api/providers/main'
import { ProvidersListQuery } from '@api/providers/types'
import { BasicProvider } from '@store/providers/list/types'
import { useDebouncedLookup } from '@hooks/useDebouncedLookup'
import { collapseWhitespace } from '@helpers/search'
import { ExploreScope, toProviderSuggestionsQuery } from './exploreParams'

/** A single letter matches nearly every provider, so it is not worth a request. */
const MIN_QUERY_LENGTH = 2

/**
 * A keystroke is not a query. 300ms — the organization field's figure — lets a typed word
 * cost one request instead of five while still reading as live.
 */
const SUGGESTIONS_DEBOUNCE_MS = 300

export type ProviderSuggestions = {
  providers: BasicProvider[]
  /** The text is too short to search, so there is nothing to say — not even "no matches". */
  isIdle: boolean
  isLoading: boolean
  /** The latest request failed. The field still submits; only the shortcut is gone. */
  failed: boolean
}

const fetchSuggestions = async (request: ProvidersListQuery): Promise<BasicProvider[]> => {
  const { list } = await getProvidersListAPI(request)
  return list.allIds.map((providerId) => list.byId[providerId!])
}

/**
 * The search box's dropdown: the first few providers the typed text would match, fetched
 * on the client while the grid below stays on the last *submitted* query. The debounce and
 * the stale-answer guard are `useDebouncedLookup`'s.
 */
export const useProviderSuggestions = (scope: ExploreScope, text: string): ProviderSuggestions => {
  const { categoryId, available, openToday, sort } = scope
  const query = collapseWhitespace(text)

  const request = useMemo(
    () =>
      query.length >= MIN_QUERY_LENGTH
        ? toProviderSuggestionsQuery({ categoryId, available, openToday, sort }, query)
        : null,
    [available, categoryId, openToday, query, sort]
  )

  // The dropdown is a shortcut, not the search: Enter still reaches the grid, so a
  // failure degrades to a note in the dropdown instead of an error on the page.
  const { result, ...status } = useDebouncedLookup(request, fetchSuggestions, {
    delayMs: SUGGESTIONS_DEBOUNCE_MS,
    errorContext: 'ProviderSearchField:suggestions',
  })

  return { providers: result ?? [], ...status }
}

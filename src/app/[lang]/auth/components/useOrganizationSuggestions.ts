'use client'

import { searchOrganizationsAPI } from '@api/organizations/main'
import { BasicOrganization } from '@store/organizations/single/types'
import { useDebouncedLookup } from '@hooks/useDebouncedLookup'
import { collapseWhitespace } from '@helpers/search'

/** Enough to recognise your own organization, short enough that the add-new row stays in view. */
export const ORGANIZATION_SUGGESTIONS_LIMIT = 5

/**
 * From the first character. Unlike Explore, the dropdown here also carries the "add as new"
 * row, so staying shut for one letter hid the way to add a new organization.
 */
const MIN_QUERY_LENGTH = 1

/** Explore's figure — a typed word costs one request instead of five. */
const SUGGESTIONS_DEBOUNCE_MS = 300

export type OrganizationSuggestions = {
  organizations: BasicOrganization[]
  /** Nothing typed yet, so the dropdown stays shut. */
  isIdle: boolean
  isLoading: boolean
  /** The latest request failed. Adding a new organization still works. */
  failed: boolean
}

const fetchOrganizations = (query: string): Promise<BasicOrganization[]> =>
  searchOrganizationsAPI({ query, limit: ORGANIZATION_SUGGESTIONS_LIMIT })

/**
 * The registration Organization field's dropdown: the organizations the API ranks best for
 * the typed text — case, accents and spacing ignored, typos and word order tolerated. The
 * trimmed, space-collapsed text is its own request identity: a string compares by value,
 * so no memo is needed, and "acme  dental" costs no second request after "acme dental".
 */
export const useOrganizationSuggestions = (text: string): OrganizationSuggestions => {
  const query = collapseWhitespace(text)

  const { result, ...status } = useDebouncedLookup(
    query.length >= MIN_QUERY_LENGTH ? query : null,
    fetchOrganizations,
    { delayMs: SUGGESTIONS_DEBOUNCE_MS, errorContext: 'OrganizationSearchField:suggestions' }
  )

  return { organizations: result ?? [], ...status }
}

import { StateCommonProps } from '@interfaces/store'

/**
 * How many bookings are waiting on this provider's decision.
 *
 * A store slice rather than local state in either component, because the number is
 * **read in one place and written in another**: the sidebar badge lives in the account
 * layout, and the thing that changes it is an approve/decline on the Approvals panel the
 * layout renders as opaque `children`. There is no prop path between them.
 *
 * Only the count is held. The queue itself stays local to `ProviderApprovalsClient` — it
 * is paged, refetched and thrown away, and nothing outside that panel reads a row.
 */
export type ProviderApprovalsState = {
  /** `0` is a real answer: no badge. The initial state is also `0`, so the badge simply
   *  appears once the first count lands rather than flashing a placeholder. */
  count: number
} & StateCommonProps

export type ProviderApprovalsActions = {
  setProviderApprovalsState: (payload: Partial<ProviderApprovalsState>) => void
  /** Re-reads the count. Called on mount by the layout, and after every decision. */
  getPendingApprovalsCount: () => Promise<void>
}

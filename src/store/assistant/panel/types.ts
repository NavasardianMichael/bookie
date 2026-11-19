/**
 * The provider assistant's floating panel, shared across the app.
 *
 * A store slice because both values are **written in one place and read in another**: the
 * launcher lives in the app shell (`App.tsx`), while whatever the assistant just changed is
 * shown by a page the shell renders as opaque `children` — the settings tab, the bookings list.
 * Neither has a prop path to the other.
 */
export type AssistantPanelState = {
  open: boolean
  /**
   * Desktop only: the panel docked along the bottom of the page instead of the corner. Shared
   * because the launcher hides while it is — the expanded panel covers its spot.
   */
  expanded: boolean
  /** Bumped after each apply — a page keyed or effected on it re-reads what was just written. */
  revision: number
}

export type AssistantPanelActions = {
  setAssistantPanelState: (payload: Partial<AssistantPanelState>) => void
  /** Something from a proposal went through: every listening page reads its data again. */
  markApplied: () => void
}

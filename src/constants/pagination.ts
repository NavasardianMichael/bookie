/**
 * A pager is omitted until the list is at least this long.
 *
 * Ten is the smallest bookings page size (`pageSizeOptions` starts at 10) and the
 * approvals page size. Below it there is no second page to offer, and drawing the
 * block anyway — including a size changer — reads as a control for a list that does
 * not have one. Public lists whose page is shorter than this (reviews are five)
 * still have to show every row when they skip the pager, or the tail of the list
 * becomes unreachable.
 */
export const PAGINATION_MIN_ITEMS = 10

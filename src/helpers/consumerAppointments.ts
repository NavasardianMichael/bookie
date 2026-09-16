export const CONSUMER_APPOINTMENT_SORTS = ['startDesc', 'startAsc', 'createdDesc', 'nameAsc'] as const

export type ConsumerAppointmentSort = (typeof CONSUMER_APPOINTMENT_SORTS)[number]

export const CONSUMER_APPOINTMENT_LIVE_STATUSES = ['scheduled', 'confirmed'] as const

export type ConsumerAppointmentListItem = {
  id: string
  status: string
  time: { startDate: string }
  createdAt?: string
  provider?: { basic: { firstName: string; lastName: string } }
  service?: { name: string }
}

const providerName = (item: ConsumerAppointmentListItem): string =>
  item.provider ? `${item.provider.basic.firstName} ${item.provider.basic.lastName}`.trim() : ''

const isUpcoming = (item: ConsumerAppointmentListItem, nowMs: number): boolean =>
  new Date(item.time.startDate).getTime() >= nowMs &&
  CONSUMER_APPOINTMENT_LIVE_STATUSES.includes(
    item.status as (typeof CONSUMER_APPOINTMENT_LIVE_STATUSES)[number]
  )

const matchesQuery = (item: ConsumerAppointmentListItem, needle: string): boolean => {
  const haystack = `${providerName(item)} ${item.service?.name ?? ''}`.toLowerCase()
  return haystack.includes(needle)
}

const compare = (
  left: ConsumerAppointmentListItem,
  right: ConsumerAppointmentListItem,
  sort: ConsumerAppointmentSort
): number => {
  switch (sort) {
    case 'startAsc':
      return new Date(left.time.startDate).getTime() - new Date(right.time.startDate).getTime()
    case 'createdDesc':
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    case 'nameAsc':
      return providerName(left).localeCompare(providerName(right))
    case 'startDesc':
    default:
      return new Date(right.time.startDate).getTime() - new Date(left.time.startDate).getTime()
  }
}

/**
 * Consumer appointments tab: upcoming-only until a search or status filter is
 * applied, then the full history. Sort is always applied.
 */
export const filterAndSortConsumerAppointments = <T extends ConsumerAppointmentListItem>(
  items: T[],
  options: { q: string; statuses: string[]; sort: ConsumerAppointmentSort; now?: Date }
): T[] => {
  const nowMs = (options.now ?? new Date()).getTime()
  const needle = options.q.trim().toLowerCase()
  const hasStatusFilter = options.statuses.length > 0

  return items
    .filter((item) => {
      if (hasStatusFilter && !options.statuses.includes(item.status)) return false
      if (!hasStatusFilter && !needle && !isUpcoming(item, nowMs)) return false
      if (needle && !matchesQuery(item, needle)) return false
      return true
    })
    .sort((left, right) => compare(left, right, options.sort))
}

import {
  CreateAppointmentAPI,
  GetProviderBookingsAPI,
  GetProviderBookingsCalendarAPI,
  ListAppointmentsAPI,
  PatchAppointmentStatusAPI,
} from './types'

export const processCreateAppointmentResponse: CreateAppointmentAPI['processor'] = (response) => response.value

/** `?? []` so a provider with no bookings yet renders an empty list, not a crash. */
export const processListAppointmentsResponse: ListAppointmentsAPI['processor'] = (response) => response.value ?? []

/**
 * The page window is kept alongside the items rather than flattened away — the pager
 * needs `pageCount`, and the heading needs `total` even on a page that is not the first.
 */
export const processProviderBookingsResponse: GetProviderBookingsAPI['processor'] = (response) => {
  const { items, total, page, perPage, pageCount } = response.value
  return { items: items ?? [], total, page, perPage, pageCount }
}

/**
 * Only the day map survives: the caller already knows which month and timezone it asked
 * for, so echoing them back into component state would be two more things to keep in
 * step with the request that produced them.
 */
export const processProviderBookingsCalendarResponse: GetProviderBookingsCalendarAPI['processor'] = (response) =>
  response.value?.days ?? {}

export const processPatchAppointmentStatusResponse: PatchAppointmentStatusAPI['processor'] = (response) =>
  response.value

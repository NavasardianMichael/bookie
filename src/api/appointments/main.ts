import { cache } from 'react'
import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { paramsToQueryString } from '@helpers/api'
import { ENDPOINTS } from './endpoints'
import {
  processCreateAppointmentResponse,
  processListAppointmentsResponse,
  processManagedAppointmentResponse,
  processPatchAppointmentStatusResponse,
  processPatchManagedAppointmentResponse,
  processProviderBookingsCalendarResponse,
  processProviderBookingsResponse,
} from './processors'
import {
  CreateAppointmentAPI,
  GetManagedAppointmentAPI,
  GetProviderBookingsAPI,
  GetProviderBookingsCalendarAPI,
  ListAppointmentsAPI,
  PatchAppointmentStatusAPI,
  PatchManagedAppointmentAPI,
} from './types'

/**
 * The provider's own timezone, as the browser reports it.
 *
 * Sent with every workspace read because `startAt` is stored in UTC and `Provider`
 * carries no timezone column: without it the server would bucket an evening booking
 * onto the following day for anyone east of Greenwich. Guarded because
 * `Intl.DateTimeFormat` is not available in every SSR environment, and the server
 * falls back to UTC on an empty or unknown value.
 */
const currentTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    return ''
  }
}

export const createAppointmentAPI: CreateAppointmentAPI['api'] = async (params) => {
  const { data } = await axiosInstance.post<APIResponse<CreateAppointmentAPI['response']>>(
    ENDPOINTS.createAppointment,
    params
  )
  return processCreateAppointmentResponse(data)
}

export const listAppointmentsAPI: ListAppointmentsAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<ListAppointmentsAPI['response']>>(ENDPOINTS.listAppointments)
  return processListAppointmentsResponse(data)
}

export const getProviderBookingsAPI: GetProviderBookingsAPI['api'] = async (query) => {
  const queryString = paramsToQueryString({ ...query, tz: currentTimeZone() })
  const { data } = await axiosInstance.get<APIResponse<GetProviderBookingsAPI['response']>>(
    queryString ? `${ENDPOINTS.getProviderBookings}?${queryString}` : ENDPOINTS.getProviderBookings
  )
  return processProviderBookingsResponse(data)
}

export const getProviderBookingsCalendarAPI: GetProviderBookingsCalendarAPI['api'] = async ({ month }) => {
  const queryString = paramsToQueryString({ month, tz: currentTimeZone() })
  const { data } = await axiosInstance.get<APIResponse<GetProviderBookingsCalendarAPI['response']>>(
    `${ENDPOINTS.getProviderBookingsCalendar}?${queryString}`
  )
  return processProviderBookingsCalendarResponse(data)
}

/**
 * The id is interpolated at the call site rather than stored in `ENDPOINTS`, which holds
 * base paths only.
 */
export const patchAppointmentStatusAPI: PatchAppointmentStatusAPI['api'] = async ({ id, status }) => {
  const { data } = await axiosInstance.patch<APIResponse<PatchAppointmentStatusAPI['response']>>(
    `${ENDPOINTS.patchAppointmentStatus}/${id}`,
    { status }
  )
  return processPatchAppointmentStatusResponse(data)
}

/** Dedupes generateMetadata + page fetches within a single request. */
const fetchManagedAppointment = cache(async (token: string, cookie: string) => {
  const { data } = await axiosInstance.get<APIResponse<GetManagedAppointmentAPI['response']>>(
    `${ENDPOINTS.manageAppointment}/${token}`,
    cookie ? { headers: { Cookie: cookie } } : undefined
  )
  return processManagedAppointmentResponse(data)
})

export const getManagedAppointmentAPI: GetManagedAppointmentAPI['api'] = async (args) =>
  fetchManagedAppointment(args.token, args.cookie ?? '')

export const patchManagedAppointmentAPI: PatchManagedAppointmentAPI['api'] = async (params) => {
  const { token, ...body } = params
  const { data } = await axiosInstance.patch<APIResponse<PatchManagedAppointmentAPI['response']>>(
    `${ENDPOINTS.manageAppointment}/${token}`,
    body
  )
  return processPatchManagedAppointmentResponse(data)
}

import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { getRuntimeTimeZone } from '@helpers/timeZone'
import { ENDPOINTS } from './endpoints'
import { processCreateImportedBookingsResponse, processParseBookingPhotoResponse } from './processors'
import { CreateImportedBookingsAPI, ParseBookingPhotoAPI } from './types'

/**
 * Multipart, because it carries the photo — which also moves it onto the upload timeout,
 * room for a slow mobile upload plus the model's read. `tz` is the browser's zone, used by
 * the API only when the provider has never set one, so "tomorrow" still lands on their day.
 */
export const parseBookingPhotoAPI: ParseBookingPhotoAPI['api'] = async ({ image, note, locale }) => {
  const { data } = await axiosInstance.post<APIResponse<ParseBookingPhotoAPI['response']>>(
    ENDPOINTS.parseBookingPhoto,
    { image, note: note ?? '', locale, tz: getRuntimeTimeZone() ?? '' },
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return processParseBookingPhotoResponse(data)
}

export const createImportedBookingsAPI: CreateImportedBookingsAPI['api'] = async (payload) => {
  const { data } = await axiosInstance.post<APIResponse<CreateImportedBookingsAPI['response']>>(
    ENDPOINTS.createImportedBookings,
    payload
  )
  return processCreateImportedBookingsResponse(data)
}

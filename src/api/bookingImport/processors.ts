import { CreateImportedBookingsAPI, ParseBookingPhotoAPI } from './types'

export const processParseBookingPhotoResponse: ParseBookingPhotoAPI['processor'] = (response) =>
  response.value?.drafts ?? []

export const processCreateImportedBookingsResponse: CreateImportedBookingsAPI['processor'] = (response) =>
  response.value?.created ?? 0

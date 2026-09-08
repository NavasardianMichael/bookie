import { CreateAppointmentAPI, ListAppointmentsAPI } from './types'

export const processCreateAppointmentResponse: CreateAppointmentAPI['processor'] = (response) => response.value

/** `?? []` so a provider with no bookings yet renders an empty list, not a crash. */
export const processListAppointmentsResponse: ListAppointmentsAPI['processor'] = (response) => response.value ?? []

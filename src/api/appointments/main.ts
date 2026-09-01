import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { AppointmentResponse, CreateAppointmentPayload } from './types'

export const createAppointmentAPI = async (payload: CreateAppointmentPayload) => {
  const { data } = await axiosInstance.post<APIResponse<AppointmentResponse>>(ENDPOINTS.createAppointment, payload)
  if (data.error) throw data.error
  return data.value!
}

export const listAppointmentsAPI = async () => {
  const { data } = await axiosInstance.get<APIResponse<AppointmentResponse[]>>(ENDPOINTS.listAppointments)
  if (data.error) throw data.error
  return data.value ?? []
}

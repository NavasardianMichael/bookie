import { axiosInstance } from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processCreateAppointmentResponse, processListAppointmentsResponse } from './processors'
import { CreateAppointmentAPI, ListAppointmentsAPI } from './types'

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

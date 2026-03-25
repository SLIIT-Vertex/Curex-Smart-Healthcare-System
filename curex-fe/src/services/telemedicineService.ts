import api from './axiosInstance'
import type {
  CreateTelemedicineSessionPayload,
  EndTelemedicineSessionPayload,
  TelemedicineSessionRecord,
} from '../types/telemedicine.ts'

export async function createTelemedicineSession(
  appointmentId: string,
  payload: CreateTelemedicineSessionPayload
): Promise<TelemedicineSessionRecord> {
  const { data } = await api.post<TelemedicineSessionRecord>(
    `/api/telemed/appointments/${appointmentId}/session`,
    payload
  )
  return data
}

export async function getTelemedicineSession(
  appointmentId: string
): Promise<TelemedicineSessionRecord | null> {
  try {
    const { data } = await api.get<TelemedicineSessionRecord>(
      `/api/telemed/appointments/${appointmentId}/session`
    )
    return data
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function endTelemedicineSession(
  appointmentId: string,
  payload?: EndTelemedicineSessionPayload
): Promise<TelemedicineSessionRecord> {
  const { data } = await api.post<TelemedicineSessionRecord>(
    `/api/telemed/appointments/${appointmentId}/end`,
    payload ?? {}
  )
  return data
}

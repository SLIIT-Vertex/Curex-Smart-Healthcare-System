import axios from 'axios'
import type {
  CreateTelemedicineSessionPayload,
  EndTelemedicineSessionPayload,
  TelemedicineSessionRecord,
} from '../types/telemedicine.ts'

const TELEMEDICINE_BASE_URL =
  import.meta.env.VITE_TELEMEDICINE_API_URL ?? 'http://localhost:8089'

const telemedicineApi = axios.create({
  baseURL: TELEMEDICINE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function createTelemedicineSession(
  appointmentId: string,
  payload: CreateTelemedicineSessionPayload
): Promise<TelemedicineSessionRecord> {
  const { data } = await telemedicineApi.post<TelemedicineSessionRecord>(
    `/api/telemed/appointments/${appointmentId}/session`,
    payload
  )
  return data
}

export async function getTelemedicineSession(
  appointmentId: string
): Promise<TelemedicineSessionRecord | null> {
  try {
    const { data } = await telemedicineApi.get<TelemedicineSessionRecord>(
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
  const { data } = await telemedicineApi.post<TelemedicineSessionRecord>(
    `/api/telemed/appointments/${appointmentId}/end`,
    payload ?? {}
  )
  return data
}

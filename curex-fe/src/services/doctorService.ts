import axios from 'axios'
import api from './axiosInstance'
import { userService } from './userService'
import type { UserInfo } from '../types/auth'

export interface DoctorProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  specialization?: string
  qualifications?: string
  experience?: number
  consultationFee?: number
  bio?: string
  avatarUrl?: string
  verified: boolean
}

export async function createDoctorProfile(
  user: UserInfo,
): Promise<DoctorProfile> {
  let specialty = 'General Medicine'
  try {
    const full = await userService.getMyProfile()
    if (full.specialty) specialty = full.specialty
  } catch {
    // fall back to default specialty
  }

  const { data } = await api.post<DoctorProfile>('/api/doctors', {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phoneNumber ?? '',
    specialization: specialty,
  })
  return data
}

/**
 * Resolves the doctor-service profile for a given user ID.
 * If no profile exists yet (404), one is auto-created so pages that depend on
 * a doctor-service record (prescriptions, availability) work seamlessly.
 */
export async function getDoctorByUserId(
  userId: string,
  user?: UserInfo,
): Promise<DoctorProfile> {
  try {
    const { data } = await api.get<DoctorProfile>(
      `/api/doctors/by-user/${userId}`,
    )
    return data
  } catch (err) {
    const is404 = axios.isAxiosError(err) && err.response?.status === 404

    if (is404 && user) {
      return createDoctorProfile(user)
    }
    throw err
  }
}

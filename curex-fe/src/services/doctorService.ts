import api from './axiosInstance'

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

export async function getDoctorByUserId(
  userId: string
): Promise<DoctorProfile> {
  const { data } = await api.get<DoctorProfile>(
    `/api/doctors/by-user/${userId}`
  )
  return data
}
